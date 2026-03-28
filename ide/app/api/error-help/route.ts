import { NextResponse } from "next/server";
import errorHelpDatabase from "@/data/errorHelpDatabase.json";

export async function GET() {
  return NextResponse.json(errorHelpDatabase);
}
