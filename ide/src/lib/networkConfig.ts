export type NetworkKey = "testnet" | "futurenet" | "mainnet" | "local";

export interface NetworkConfig {
  label: string;
  horizon: string;
  horizonUrl: string;
  passphrase: string;
  secondaryRpcUrls: string[];
}

export interface CustomHeaders {
  [key: string]: string;
}

export const NETWORK_CONFIG: Record<NetworkKey, NetworkConfig> = {
  testnet: {
    label: "Testnet",
    horizon: "https://soroban-testnet.stellar.org:443",
    horizonUrl: "https://horizon-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
    secondaryRpcUrls: [],
  },
  futurenet: {
    label: "Futurenet",
    horizon: "https://soroban-futurenet.stellar.org:443",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    passphrase: "Future SDF Network ; October 2022",
    secondaryRpcUrls: [],
  },
  mainnet: {
    label: "Mainnet",
    horizon: "https://horizon.stellar.org:443",
    horizonUrl: "https://horizon.stellar.org",
    passphrase: "Public Global Stellar Network ; September 2015",
    secondaryRpcUrls: [],
  },
  local: {
    label: "Local",
    horizon: "http://localhost:8000",
    horizonUrl: "http://localhost:8000",
    passphrase: "Local Stellar Network",
    secondaryRpcUrls: [],
  },
};

export const DEFAULT_CUSTOM_RPC = "http://localhost:8000";
