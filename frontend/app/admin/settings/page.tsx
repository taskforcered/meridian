'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ROLE_OPTIONS } from '@/lib/types';
import type { PlatformSettings, Role } from '@/lib/types';

type FlagKey = 'use_real_ocr' | 'use_real_llm' | 'use_local_ocr' | 'use_anthropic_llm';
type FlagChoice = 'env' | 'on' | 'off';

const FLAGS: { key: FlagKey; label: string }[] = [
  { key: 'use_real_ocr', label: 'Use real OCR (AWS Textract)' },
  { key: 'use_local_ocr', label: 'Use local OCR (Tesseract)' },
  { key: 'use_real_llm', label: 'Use real LLM (AWS Bedrock / Claude)' },
  { key: 'use_anthropic_llm', label: 'Use Anthropic API directly' },
];

function toChoice(v: boolean | null): FlagChoice {
  return v === null ? 'env' : v ? 'on' : 'off';
}

function fromChoice(c: FlagChoice): boolean | null {
  return c === 'env' ? null : c === 'on';
}

export default function AdminSettingsPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [flagChoices, setFlagChoices] = useState<Record<FlagKey, FlagChoice>>({
    use_real_ocr: 'env', use_real_llm: 'env', use_local_ocr: 'env', use_anthropic_llm: 'env',
  });
  const [defaultOrgActive, setDefaultOrgActive] = useState(true);
  const [defaultMemberRole, setDefaultMemberRole] = useState<Role>('paralegal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function refresh() {
    setLoading(true);
    api.platformSettings.get()
      .then((s) => {
        setSettings(s);
        setFlagChoices({
          use_real_ocr: toChoice(s.use_real_ocr),
          use_real_llm: toChoice(s.use_real_llm),
          use_local_ocr: toChoice(s.use_local_ocr),
          use_anthropic_llm: toChoice(s.use_anthropic_llm),
        });
        setDefaultOrgActive(s.default_new_org_active);
        setDefaultMemberRole(s.default_new_member_role);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.is_platform_admin) refresh();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const updated = await api.platformSettings.update({
        use_real_ocr: fromChoice(flagChoices.use_real_ocr),
        use_real_llm: fromChoice(flagChoices.use_real_llm),
        use_local_ocr: fromChoice(flagChoices.use_local_ocr),
        use_anthropic_llm: fromChoice(flagChoices.use_anthropic_llm),
        default_new_org_active: defaultOrgActive,
        default_new_member_role: defaultMemberRole,
      });
      setSettings((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <div className="text-sm text-gray-400 py-8 text-center dark:text-gray-500">Loading…</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1 dark:text-gray-50">Global Settings</h2>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        Platform-wide feature flags and defaults applied to newly created organizations and members.
      </p>

      <form onSubmit={handleSave} className="max-w-xl space-y-8">
        <section className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-900 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 dark:text-gray-100">Feature flags</h3>
          <div className="space-y-4">
            {FLAGS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-700 dark:text-gray-300">{f.label}</label>
                <select
                  value={flagChoices[f.key]}
                  onChange={(e) => setFlagChoices((prev) => ({ ...prev, [f.key]: e.target.value as FlagChoice }))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
                >
                  <option value="env">Environment default ({settings.env_defaults[f.key] ? 'On' : 'Off'})</option>
                  <option value="on">Force On</option>
                  <option value="off">Force Off</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-900 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 dark:text-gray-100">New organization defaults</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={defaultOrgActive}
                onChange={(e) => setDefaultOrgActive(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              New organizations start active
            </label>
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700 dark:text-gray-300">Default role for new members</label>
              <select
                value={defaultMemberRole}
                onChange={(e) => setDefaultMemberRole(e.target.value as Role)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-60 transition-colors dark:hover:bg-blue-500"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && !saving && (
            <span className="text-sm text-green-700 dark:text-green-400">Saved.</span>
          )}
        </div>
      </form>
    </div>
  );
}
