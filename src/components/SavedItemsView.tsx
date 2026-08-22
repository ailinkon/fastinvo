import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit, Undo2, Check, X, Package, Tag, ArrowLeft } from 'lucide-react';
import { SavedItem, Currency } from '../types';
import { formatMoney } from '../constants';

interface SavedItemsViewProps {
  savedItems: SavedItem[];
  setSavedItems: React.Dispatch<React.SetStateAction<SavedItem[]>>;
  currency: Currency;
  onBack?: () => void;
}

export default function SavedItemsView({
  savedItems,
  setSavedItems,
  currency,
  onBack,
}: SavedItemsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Item Form State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');

  // Undo Delete State
  const [undoBuffer, setUndoBuffer] = useState<{ item: SavedItem; timeoutId: any } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredItems = savedItems.filter((item) => {
    if (undoBuffer && undoBuffer.item.id === item.id) return false;
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.defaultPrice.toString().includes(query)
    );
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const price = parseFloat(newPrice) || 0;
    const taxRate = newTaxRate ? parseFloat(newTaxRate) : undefined;

    const newItem: SavedItem = {
      id: `item-${Date.now()}`,
      name: newName.trim(),
      defaultPrice: price,
      defaultTaxRate: taxRate,
    };

    setSavedItems((prev) => [newItem, ...prev]);

    // Reset Form
    setNewName('');
    setNewPrice('');
    setNewTaxRate('');
    setIsAddingNew(false);

    setToastMessage(`Saved "${newItem.name}" to library`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    setSavedItems((prev) =>
      prev.map((item) => (item.id === editingItem.id ? editingItem : item))
    );

    setToastMessage(`Updated "${editingItem.name}"`);
    setEditingItem(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteWithUndo = (item: SavedItem) => {
    if (undoBuffer) {
      clearTimeout(undoBuffer.timeoutId);
      setSavedItems((prev) => prev.filter((i) => i.id !== undoBuffer.item.id));
    }

    const timeoutId = setTimeout(() => {
      setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
      setUndoBuffer(null);
    }, 4500);

    setUndoBuffer({ item, timeoutId });
  };

  const handleUndoDelete = () => {
    if (undoBuffer) {
      clearTimeout(undoBuffer.timeoutId);
      setUndoBuffer(null);
      setToastMessage(`Restored "${undoBuffer.item.name}"`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-3xl mx-auto font-sans relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Saved Items Library
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              frequently invoiced products &amp; services for quick autofill
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="py-2.5 px-4 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md shadow-[#0F3D2E]/20 flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search saved items by name or price..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3D2E] shadow-2xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Manual Add Modal / Form Sheet */}
      {isAddingNew && (
        <form
          onSubmit={handleAddItem}
          className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Add New Saved Item</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Item / Service Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Website Maintenance, Milk 1L, Hourly Consulting"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Default Price ({currency.symbol})
              </label>
              <input
                type="number"
                step="any"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Default Tax Rate % (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={newTaxRate}
                onChange={(e) => setNewTaxRate(e.target.value)}
                placeholder="e.g. 10 or 0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
              />
            </div>

            <div className="flex items-end justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white text-xs font-extrabold cursor-pointer shadow-sm active:scale-95"
              >
                Save Item
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <form
          onSubmit={handleSaveEdit}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Edit className="w-4 h-4 text-indigo-600" />
              <span>Edit Saved Item</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Item / Service Name
              </label>
              <input
                type="text"
                required
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Default Price ({currency.symbol})
              </label>
              <input
                type="number"
                step="any"
                value={editingItem.defaultPrice}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    defaultPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Default Tax Rate %
              </label>
              <input
                type="number"
                step="any"
                value={editingItem.defaultTaxRate !== undefined ? editingItem.defaultTaxRate : ''}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    defaultTaxRate: e.target.value !== '' ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="Optional"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold cursor-pointer shadow-sm active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            {searchTerm ? 'No saved items match your search' : 'No saved items in library yet'}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Saved items build automatically as you save invoices, or you can add items manually above.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
                  <Tag className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span>Default: {formatMoney(item.defaultPrice, currency)}</span>
                    {item.defaultTaxRate !== undefined && item.defaultTaxRate > 0 && (
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {item.defaultTaxRate}% tax
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Edit item defaults"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteWithUndo(item)}
                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Delete item from library"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Undo Toast Banner */}
      {undoBuffer && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 border border-slate-700 animate-slideUp">
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                Deleted "{undoBuffer.item.name}"
              </p>
              <p className="text-[10px] text-slate-400">Removed from library in 4s</p>
            </div>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        </div>
      )}

      {/* General Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white text-xs font-extrabold py-2 px-4 rounded-full shadow-lg border border-emerald-700 animate-fadeIn">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
