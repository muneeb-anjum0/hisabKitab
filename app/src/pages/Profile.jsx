import { useState } from 'react';
import { useAuth } from '../contexts/auth';
import { useData } from '../contexts/data';
import { Button, Modal } from '../components/comic/Comic';

export default function Profile() {
  const auth = useAuth();
  const data = useData();
  const [category, setCategory] = useState('');
  const [deletingCategory, setDeletingCategory] = useState(null);
  return (
    <>
      <div className="page-title compact">
        <span className="kicker">BEHIND THE BOOK</span>
        <h1>PROFILE</h1>
      </div>
      <section className="profile-grid">
        <div className="panel identity">
          <div className="big-avatar">
            {auth.user?.displayName?.[0] || auth.user?.email?.[0] || 'H'}
          </div>
          <h2>{auth.user?.displayName || 'Ledger keeper'}</h2>
          <p>{auth.user?.email}</p>
          <Button variant="paper" onClick={auth.logout}>
            LOG OUT
          </Button>
        </div>
        <div className="panel settings">
          <details className="category-settings">
            <summary role="button">
              <span>CATEGORIES</span>
              <b>OPEN</b>
            </summary>
            <div className="category-settings-body">
              <p>
                Start with four. Delete any of them, or add as many useful categories as you need.
              </p>
              <div className="category-cloud">
                {data.categories.map((item) => (
                  <span key={item.id}>
                    {item.symbol} {item.name}
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(item)}
                      aria-label={`Delete ${item.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!category.trim()) return;
                  await data.addCategory(category.trim());
                  setCategory('');
                }}
              >
                <label className="field">
                  <span>NEW CATEGORY</span>
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    maxLength="30"
                    placeholder="Pets, Gifts…"
                  />
                </label>
                <Button disabled={!category.trim()}>ADD CATEGORY</Button>
              </form>
            </div>
          </details>
        </div>
        <div className="panel pwa-note web-install-note">
          <b>PUT IT IN YOUR POCKET</b>
          <p>
            Install HisabKitab from your browser menu for a full-screen application and cached
            shell.
          </p>
        </div>
      </section>
      {deletingCategory && (
        <DeleteCategory
          category={deletingCategory}
          usageCount={
            data.transactions.filter((item) => item.categoryId === deletingCategory.id).length
          }
          onClose={() => setDeletingCategory(null)}
          onDelete={async () => {
            await data.removeCategory(deletingCategory);
            setDeletingCategory(null);
          }}
        />
      )}
    </>
  );
}

function DeleteCategory({ category, usageCount, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title={`DELETE “${category.name}”?`} onClose={onClose}>
      <div className="delete-preview">
        <strong>
          {category.symbol} {category.name}
        </strong>
        <span>
          {usageCount} existing expense{usageCount === 1 ? '' : 's'} use this category
        </span>
      </div>
      <p>
        The category will disappear from future choices. Existing ledger entries stay safe and
        unchanged.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="confirm-actions">
        <Button variant="paper" onClick={onClose} disabled={busy}>
          CANCEL
        </Button>
        <Button
          className="danger-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onDelete();
            } catch (deleteError) {
              setError(deleteError.message);
              setBusy(false);
            }
          }}
        >
          {busy ? 'DELETING…' : 'DELETE CATEGORY'}
        </Button>
      </div>
    </Modal>
  );
}
