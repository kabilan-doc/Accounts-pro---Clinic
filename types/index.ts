export type ProfileRole = 'admin' | 'staff';

export interface Profile {
  id: string;
  full_name: string;
  role: ProfileRole;
  phone_number: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until: string | null;
}

export interface AccountEntry {
  id: string;
  entry_date: string;
  entry_type: 'income' | 'expense';
  category: string;
  subcategory?: string | null;
  payment_mode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit';
  amount: number;
  description: string;
  reference_number?: string | null;
  entered_by: string;
  is_voided: boolean;
  void_reason?: string | null;
  voided_by?: string | null;
  voided_at?: string | null;
  created_at: string;
}
