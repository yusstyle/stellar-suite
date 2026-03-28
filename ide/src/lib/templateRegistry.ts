import type { FileNode } from "@/lib/sample-contracts";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  files: FileNode[];
}

export const templateRegistry: ProjectTemplate[] = [
  {
    id: "hello-world",
    name: "Hello World",
    description:
      "A minimal Soroban smart contract that returns a greeting. Great starting point to learn the basics.",
    tags: ["beginner", "basics"],
    files: [
      {
        name: "hello_world",
        type: "folder",
        children: [
          {
            name: "Cargo.toml",
            type: "file",
            language: "toml",
            content: `# Cargo.toml — project manifest for the hello_world Soroban contract.
# "cdylib" produces a .wasm binary that the Soroban runtime can load.
[package]
name = "hello-world"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = { workspace = true }

[dev-dependencies]
soroban-sdk = { workspace = true, features = ["testutils"] }`,
          },
          {
            name: "lib.rs",
            type: "file",
            language: "rust",
            content: `//! Hello World — the simplest possible Soroban contract.
//!
//! This contract exposes a single function, \`hello\`, which accepts
//! a name (\`Symbol\`) and returns a \`Vec<Symbol>\` containing
//! the greeting ["Hello", <name>].

// Soroban contracts target Wasm, which has no standard library.
#![no_std]

// Import core Soroban types and macros.
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, Symbol, Vec};

// The \`#[contract]\` attribute marks this struct as a Soroban smart contract.
#[contract]
pub struct HelloContract;

// \`#[contractimpl]\` generates the Wasm entry points for every \`pub fn\` inside.
#[contractimpl]
impl HelloContract {
    /// Return a greeting vector: ["Hello", <to>].
    ///
    /// # Arguments
    /// * \`env\` — the Soroban host environment (storage, events, auth, etc.)
    /// * \`to\`  — a short symbol representing the name to greet
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        // \`symbol_short!\` creates a Symbol from a string literal (max 9 chars).
        // \`vec!\` builds a Soroban Vec allocated in the contract's linear memory.
        vec![&env, symbol_short!("Hello"), to]
    }
}

// Pull in the test module (lives in test.rs alongside lib.rs).
mod test;`,
          },
          {
            name: "test.rs",
            type: "file",
            language: "rust",
            content: `//! Unit tests for the Hello World contract.

// Only compile this module during \`cargo test\`.
#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, vec, Env};

#[test]
fn test_hello() {
    // Create a default Soroban test environment.
    let env = Env::default();

    // Register the contract and obtain a typed client.
    let contract_id = env.register_contract(None, HelloContract);
    let client = HelloContractClient::new(&env, &contract_id);

    // Invoke \`hello\` and verify the returned vector.
    let words = client.hello(&symbol_short!("Dev"));
    assert_eq!(
        words,
        vec![&env, symbol_short!("Hello"), symbol_short!("Dev")]
    );
}`,
          },
        ],
      },
    ],
  },
  {
    id: "token",
    name: "Token",
    description:
      "A basic Soroban token contract with admin initialization, name, symbol, and decimals. Foundation for fungible assets.",
    tags: ["intermediate", "defi", "token"],
    files: [
      {
        name: "token",
        type: "folder",
        children: [
          {
            name: "Cargo.toml",
            type: "file",
            language: "toml",
            content: `# Cargo.toml — project manifest for the token Soroban contract.
[package]
name = "soroban-token"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = { workspace = true }

[dev-dependencies]
soroban-sdk = { workspace = true, features = ["testutils"] }`,
          },
          {
            name: "lib.rs",
            type: "file",
            language: "rust",
            content: `//! Token — a minimal Soroban token contract.
//!
//! Demonstrates:
//! - \`#[contracttype]\` enums for storage keys
//! - Instance storage for admin-controlled metadata
//! - \`require_auth()\` for access control

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String,
};

/// Storage keys live in an enum so every key is typed and collision-free.
/// \`#[contracttype]\` auto-derives the XDR serialisation Soroban needs.
#[contracttype]
pub enum DataKey {
    Admin,
    Name,
    Symbol,
    Decimals,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    /// One-time initialisation: set admin, decimals, name, and symbol.
    ///
    /// \`admin.require_auth()\` ensures only the admin account can call this.
    /// Values are written to **instance storage**, which persists for the
    /// lifetime of the contract instance.
    pub fn initialize(
        env: Env,
        admin: Address,
        decimal: u32,
        name: String,
        symbol: String,
    ) {
        // Verify that the admin signed this transaction.
        admin.require_auth();

        // Persist metadata in instance storage.
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Decimals, &decimal);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
    }

    /// Return the human-readable token name (e.g. "Stellar Lumen").
    pub fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap()
    }

    /// Return the short ticker symbol (e.g. "XLM").
    pub fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap()
    }

    /// Return the number of decimal places (e.g. 7 for Stellar native).
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap()
    }
}

mod test;`,
          },
          {
            name: "test.rs",
            type: "file",
            language: "rust",
            content: `//! Unit tests for the Token contract.

#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize_and_read_metadata() {
    let env = Env::default();

    // Allow all authorizations in the test environment.
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    // Generate a random test address for the admin.
    let admin = Address::generate(&env);

    // Initialize the token with metadata.
    client.initialize(
        &admin,
        &7,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "TST"),
    );

    // Verify stored values.
    assert_eq!(client.name(), String::from_str(&env, "Test Token"));
    assert_eq!(client.symbol(), String::from_str(&env, "TST"));
    assert_eq!(client.decimals(), 7);
}`,
          },
        ],
      },
    ],
  },
  {
    id: "counter",
    name: "Counter",
    description:
      "A simple counter contract that increments a stored value. Demonstrates persistent storage and TTL extensions.",
    tags: ["beginner", "storage"],
    files: [
      {
        name: "increment",
        type: "folder",
        children: [
          {
            name: "Cargo.toml",
            type: "file",
            language: "toml",
            content: `# Cargo.toml — project manifest for the counter (increment) contract.
[package]
name = "soroban-increment"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = { workspace = true }

[dev-dependencies]
soroban-sdk = { workspace = true, features = ["testutils"] }`,
          },
          {
            name: "lib.rs",
            type: "file",
            language: "rust",
            content: `//! Counter — a Soroban contract that increments a persistent counter.
//!
//! Demonstrates:
//! - Reading and writing to instance storage
//! - TTL (Time-To-Live) extension to keep data alive on the ledger
//! - The \`log!\` macro for debug output during tests

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, log, Env};

/// A single-variant enum used as the storage key for the counter value.
#[contracttype]
pub enum DataKey {
    Counter,
}

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    /// Increment the on-chain counter by 1 and return the new value.
    ///
    /// If the counter does not yet exist, it starts at 0.
    /// After writing, the storage TTL is extended so the entry
    /// survives at least 100 ledgers.
    pub fn increment(env: Env) -> u32 {
        // Read current value, defaulting to 0 if unset.
        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0);

        count += 1;

        // \`log!\` output appears in \`cargo test\` but is stripped from Wasm builds.
        log!(&env, "count: {}", count);

        // Persist the new value.
        env.storage()
            .instance()
            .set(&DataKey::Counter, &count);

        // Extend the TTL so this instance stays alive on the ledger.
        // Args: (threshold, extend_to) — both in ledger sequence numbers.
        env.storage().instance().extend_ttl(100, 100);

        count
    }

    /// Read the current counter value without modifying it.
    pub fn get_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0)
    }
}

mod test;`,
          },
          {
            name: "test.rs",
            type: "file",
            language: "rust",
            content: `//! Unit tests for the Counter contract.

#![cfg(test)]

use super::*;
use soroban_sdk::Env;

#[test]
fn test_increment() {
    let env = Env::default();
    let contract_id = env.register_contract(None, IncrementContract);
    let client = IncrementContractClient::new(&env, &contract_id);

    // First call starts at 0, increments to 1.
    assert_eq!(client.increment(), 1);

    // Subsequent calls keep incrementing.
    assert_eq!(client.increment(), 2);
    assert_eq!(client.increment(), 3);
}

#[test]
fn test_get_count_default() {
    let env = Env::default();
    let contract_id = env.register_contract(None, IncrementContract);
    let client = IncrementContractClient::new(&env, &contract_id);

    // Before any increment, get_count returns 0.
    assert_eq!(client.get_count(), 0);
}`,
          },
        ],
      },
    ],
  },
];
