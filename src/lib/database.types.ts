// Minimal placeholder types so Supabase helpers compile.
// You can replace this later with generated types if you want stricter checking.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = any;
