"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage("Erreur lors de l'envoi du lien.");
      return;
    }

    if (!data) {
      setMessage("Aucune donnée reçue depuis Supabase.");
      return;
    }

    setMessage("Email envoyé ! Vérifie ta boîte mail.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-sm p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
        <h1 className="text-xl font-semibold">Connexion</h1>

        <input
          type="email"
          placeholder="Ton email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm"
        />

        <button
          onClick={handleLogin}
          className="w-full py-2 bg-teal-500 text-slate-900 font-semibold rounded-md hover:bg-teal-400"
        >
          Se connecter
        </button>

        {message && (
          <p className="text-sm text-teal-400 text-center">{message}</p>
        )}
      </div>
    </main>
  );
}
