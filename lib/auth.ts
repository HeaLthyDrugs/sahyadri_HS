import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Provider } from '@supabase/supabase-js';

export type AuthError = {
  message: string;
};

const supabase = createClientComponentClient();

export const auth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw { message: error.message };
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw { message: error.message };
    }

    return data;
  },

  async signInWithProvider(provider: Provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
    });

    if (error) {
      throw { message: error.message };
    }

    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw { message: error.message };
    }
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw { message: error.message };
    }
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw { message: error.message };
    }
  },

  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  },
}; 