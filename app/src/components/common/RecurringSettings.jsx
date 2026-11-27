import { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/auth';
import { useData } from '../../contexts/data';
import { money } from '../../lib/currency';
import { localISO } from '../../lib/dates';
import { Button, ComicSelect, Field } from '../comic/Comic';

export default function RecurringSettings() {
  const data = useData();
  const { user } = useAuth();
  const editableFunds = useMemo(() => {
    const ids = new Set(
      data.memberships
        .filter((item) => item.userId === user.uid && ['owner', 'editor'].includes(item.role))
        .map((item) => item.fundId),
    );
    return data.funds.filter((fund) => ids.has(fund.id) && !fund.archived);
  }, [data.funds, data.memberships, user.uid]);
  const [values, setValues] = useState({
    type: 'expense',
    description: '',
    amount: '',
    fundId: '',
    categoryId: 'other',
    startDate: localISO(),
    day: Math.min(new Date().getDate(), 28),
    reminder: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await data.createRecurringRule({
        ...values,
        fundId: values.fundId || editableFunds[0]?.id,
        amount: Number(values.amount),
        day: Number(values.day),
        description: values.description.trim(),
      });
      setValues((current) => ({ ...current, description: '', amount: '' }));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel settings recurring-settings">
      <h2>RECURRING MONEY</h2>
      <p>
        Monthly entries are recorded when you next open the app. Due dates are limited to the
        1st–28th.
      </p>
      <form onSubmit={submit}>
        <ComicSelect
          label="TYPE"
          value={values.type}
          onChange={(type) => setValues({ ...values, type })}
          options={[
            ['expense', 'Bill or expense'],
            ['income', 'Money received'],
          ]}
        />
        <Field label="NAME">
          <input
            required
            maxLength="80"
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            placeholder="Rent, salary…"
          />
        </Field>
        <Field label="AMOUNT (RS.)">
          <input
            required
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => setValues({ ...values, amount: event.target.value })}
          />
        </Field>
        <ComicSelect
          label="FUND"
          value={values.fundId || editableFunds[0]?.id}
          onChange={(fundId) => setValues({ ...values, fundId })}
          options={editableFunds.map((fund) => [fund.id, fund.name])}
        />
        {values.type === 'expense' && (
          <ComicSelect
            label="CATEGORY"
            value={values.categoryId}
            onChange={(categoryId) => setValues({ ...values, categoryId })}
            options={data.categories.map((category) => [category.id, category.name])}
          />
        )}
        <Field label="FIRST MONTH">
          <input
            required
            type="date"
            value={values.startDate}
            onChange={(event) => setValues({ ...values, startDate: event.target.value })}
          />
        </Field>
        <Field label="DAY OF MONTH">
          <input
            required
            type="number"
            min="1"
            max="28"
            value={values.day}
            onChange={(event) => setValues({ ...values, day: event.target.value })}
          />
        </Field>
        <label className="recurring-reminder">
          <input
            type="checkbox"
            checked={values.reminder}
            onChange={(event) => setValues({ ...values, reminder: event.target.checked })}
          />{' '}
          REMIND ME ON ANDROID
        </label>
        <Button
          disabled={
            busy ||
            !editableFunds.length ||
            !values.description.trim() ||
            Number(values.amount) <= 0
          }
        >
          ADD RECURRING ENTRY
        </Button>
      </form>
      <Button
        type="button"
        variant="paper"
        onClick={async () => {
          try {
            const { requestReminderPermission, syncRecurringReminders } =
              await import('../../lib/reminders');
            await requestReminderPermission();
            await syncRecurringReminders(data.recurringRules || []);
            data.setToast({ type: 'success', message: 'REMINDERS ENABLED.' });
          } catch (permissionError) {
            setError(permissionError.message);
          }
        }}
      >
        ENABLE DEVICE REMINDERS
      </Button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ul className="recurring-list">
        {(data.recurringRules || []).map((rule) => (
          <li key={rule.id}>
            <span>
              <b>{rule.description}</b> · {money(rule.amount)} · day {rule.day} · {rule.type}
              {rule.active ? '' : ' · PAUSED'}
            </span>
            <button
              type="button"
              onClick={() => data.updateRecurringRule(rule.id, { active: !rule.active })}
            >
              {rule.active ? 'PAUSE' : 'RESUME'}
            </button>
            <button type="button" onClick={() => data.removeRecurringRule(rule.id)}>
              DELETE
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
