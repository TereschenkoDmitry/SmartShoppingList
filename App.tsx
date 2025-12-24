import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  History, 
  Sparkles, 
  Plus, 
  Trash2, 
  Circle, 
  Camera, 
  Loader2,
  TrendingUp,
  Package,
  Send,
  Edit2,
  Check,
  Share2
} from 'lucide-react';
import { ShoppingItem, PurchaseRecord, Suggestion, ViewMode, ParsedReceipt } from './types';
import { parseReceiptImage, getSmartSuggestions } from './services/geminiService';

declare global {
  interface Window {
    Telegram: any;
  }
}

const App: React.FC = () => {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id || 'default_user';

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [view, setView] = useState<ViewMode>(ViewMode.LIST);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('secondary_bg_color');
    }
  }, [tg]);

  useEffect(() => {
    if (!tg) return;
    if (view !== ViewMode.LIST) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => setView(ViewMode.LIST));
    } else {
      tg.BackButton.hide();
    }
    return () => tg.BackButton.offClick();
  }, [view, tg]);

  useEffect(() => {
    const savedItems = localStorage.getItem(`tg_items_${userId}`);
    const savedHistory = localStorage.getItem(`tg_history_${userId}`);
    if (savedItems) setItems(JSON.parse(savedItems));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(`tg_items_${userId}`, JSON.stringify(items));
  }, [items, userId]);

  useEffect(() => {
    localStorage.setItem(`tg_history_${userId}`, JSON.stringify(history));
  }, [history, userId]);

  const addItem = (name: string, quantity: string = '1') => {
    if (!name.trim()) return;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: name.trim(),
      quantity,
      category: 'General',
      isBought: false,
      addedAt: Date.now()
    };
    setItems(prev => [newItem, ...prev]);
    setNewItemName('');
    if (tg) tg.HapticFeedback.impactOccurred('light');
  };

  const startEditing = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const saveEdit = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, name: editValue } : item));
    setEditingId(null);
    if (tg) tg.HapticFeedback.impactOccurred('light');
  };

  const markAsBought = (id: string) => {
    setItems(prev => {
      const itemToBuy = prev.find(item => item.id === id);
      if (itemToBuy) {
        const record: PurchaseRecord = {
          id: Date.now().toString() + Math.random(),
          name: itemToBuy.name,
          date: Date.now(),
          category: itemToBuy.category
        };
        setHistory(h => [record, ...h]);
        if (tg) tg.HapticFeedback.notificationOccurred('success');
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (tg) tg.HapticFeedback.impactOccurred('medium');
  };

  const getFormattedList = () => {
    if (items.length === 0) return "";
    return "🛒 Мой список покупок:\n\n" + items.map(i => `• ${i.name} — ${i.quantity} шт.`).join('\n') + "\n\nСоздано в Smart Shopping Bot";
  };

  const sendListToBot = () => {
    const text = getFormattedList();
    if (!text) return;
    if (tg) {
      tg.sendData(text);
    } else {
      alert(text);
    }
  };

  const shareToAnyContact = () => {
    const text = getFormattedList();
    if (!text) {
      if (tg) tg.showAlert("Список пуст!");
      return;
    }
    const shareUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
    if (tg) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result: ParsedReceipt = await parseReceiptImage(base64);
        result.items.forEach(item => {
          addItem(item.name, item.quantity.toString());
          setHistory(h => [{
            id: Math.random().toString(),
            name: item.name,
            price: item.price,
            date: Date.now(),
            category: 'Scanned'
          }, ...h]);
        });
        setView(ViewMode.LIST);
        if (tg) tg.HapticFeedback.notificationOccurred('success');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      if (tg) tg.showAlert("Ошибка распознавания чека.");
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async () => {
    if (history.length < 3) {
      if (tg) tg.showAlert("Нужно хотя бы 3 покупки в истории!");
      return;
    }
    setLoading(true);
    try {
      const result = await getSmartSuggestions(history);
      setSuggestions(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-20 select-none" style={{ backgroundColor: 'var(--tg-bg)', color: 'var(--tg-text)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 p-4 shadow-sm flex justify-between items-center" style={{ backgroundColor: 'var(--tg-secondary)' }}>
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" style={{ color: 'var(--tg-primary)' }} />
            {user?.first_name ? user.first_name : 'SmartCart'}
          </h1>
          <p className="text-[10px] uppercase font-bold opacity-40">AI Shopping Assistant</p>
        </div>
        <div className="flex gap-1">
           <button onClick={shareToAnyContact} className="p-2 opacity-60 hover:opacity-100 transition-opacity" title="Отправить контакту">
            <Share2 className="w-5 h-5" />
          </button>
           <button onClick={sendListToBot} className="p-2 opacity-60 hover:opacity-100 transition-opacity" title="Отправить в чат бота">
            <Send className="w-5 h-5" />
          </button>
          <button onClick={() => setView(ViewMode.SCAN)} className="p-2 ml-1 rounded-full transition-all active:scale-90" style={{ backgroundColor: 'var(--tg-primary)', color: 'white' }}>
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {loading && (
          <div className="fixed inset-0 bg-black/5 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: 'var(--tg-primary)' }} />
              <p className="font-bold text-sm text-slate-600">Анализируем...</p>
            </div>
          </div>
        )}

        {view === ViewMode.LIST && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem(newItemName)}
                placeholder="Что купить?"
                className="flex-1 p-3 rounded-2xl border-none shadow-sm text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                style={{ backgroundColor: 'var(--tg-secondary)', color: 'var(--tg-text)' }}
              />
              <button onClick={() => addItem(newItemName)} className="p-3 rounded-2xl shadow-md transition-all active:scale-95" style={{ backgroundColor: 'var(--tg-primary)', color: 'white' }}>
                <Plus className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <Package className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-medium">Список пуст</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-4 rounded-2xl shadow-sm transition-all" style={{ backgroundColor: 'var(--tg-secondary)' }}>
                    <button onClick={() => markAsBought(item.id)} className="shrink-0">
                      <Circle className="w-6 h-6 opacity-30 hover:opacity-100" style={{ color: 'var(--tg-primary)' }} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      {editingId === item.id ? (
                        <div className="flex gap-2">
                          <input 
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(item.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                            className="bg-transparent border-b border-indigo-500 outline-none w-full font-medium text-sm"
                          />
                          <Check className="w-4 h-4 text-green-500 shrink-0" onClick={() => saveEdit(item.id)} />
                        </div>
                      ) : (
                        <div onClick={() => startEditing(item)} className="cursor-text">
                          <p className="font-bold text-sm truncate">{item.name}</p>
                          <span className="text-[10px] opacity-40 uppercase font-black">{item.quantity} шт.</span>
                        </div>
                      )}
                    </div>

                    <button onClick={() => removeItem(item.id)} className="opacity-20 hover:opacity-100 p-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === ViewMode.HISTORY && (
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase opacity-40 mb-2">История покупок</h2>
            {history.length === 0 ? (
              <p className="text-center py-10 opacity-30 text-xs">История пока пуста</p>
            ) : (
              history.map(record => (
                <div key={record.id} className="p-4 rounded-2xl flex justify-between items-center" style={{ backgroundColor: 'var(--tg-secondary)' }}>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{record.name}</p>
                    <p className="text-[10px] opacity-40">{new Date(record.date).toLocaleDateString()}</p>
                  </div>
                  {record.price && <span className="font-black text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600">{record.price} ₽</span>}
                </div>
              ))
            )}
          </div>
        )}

        {view === ViewMode.PREDICTIONS && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black uppercase opacity-40">AI Предсказания</h2>
              <button onClick={generateAISuggestions} className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--tg-primary)', color: 'white' }}>Обновить</button>
            </div>
            
            {suggestions.length === 0 ? (
              <div className="p-10 text-center space-y-4 rounded-3xl" style={{ backgroundColor: 'var(--tg-secondary)' }}>
                <TrendingUp className="w-12 h-12 mx-auto opacity-10" />
                <p className="font-bold opacity-60">Нужно больше данных</p>
                <button onClick={generateAISuggestions} className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95" style={{ backgroundColor: 'var(--tg-primary)', color: 'white' }}>Анализировать привычки</button>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="p-4 rounded-3xl shadow-sm" style={{ backgroundColor: 'var(--tg-secondary)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-sm">{s.name}</p>
                      <span className="text-[9px] font-black text-green-500">{Math.round(s.confidence * 100)}%</span>
                    </div>
                    <p className="text-[11px] opacity-60 mb-3 italic">"{s.reason}"</p>
                    <button onClick={() => addItem(s.name)} className="w-full py-2 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 transition-all active:scale-95" style={{ borderColor: 'var(--tg-primary)', color: 'var(--tg-primary)' }}>
                      <Plus className="w-3 h-3" /> Добавить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === ViewMode.SCAN && (
          <div className="flex flex-col items-center justify-center pt-20 space-y-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--tg-secondary)' }}>
              <Camera className="w-10 h-10" style={{ color: 'var(--tg-primary)' }} />
            </div>
            <div className="text-center px-6">
              <h3 className="font-black text-lg mb-2">Распознавание чека</h3>
              <p className="text-xs opacity-50">Gemini автоматически добавит товары из чека в ваш список и историю цен.</p>
            </div>
            <label className="w-64 cursor-pointer p-4 rounded-2xl text-center font-black shadow-xl transition-all active:scale-95" style={{ backgroundColor: 'var(--tg-primary)', color: 'white' }}>
              Сделать фото
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={() => setView(ViewMode.LIST)} className="font-bold opacity-40 py-2">Отмена</button>
          </div>
        )}
      </main>

      {view !== ViewMode.SCAN && (
        <nav className="fixed bottom-0 left-0 right-0 p-2 flex justify-around items-center z-30 shadow-2xl border-t" style={{ backgroundColor: 'var(--tg-secondary)', borderColor: 'rgba(0,0,0,0.05)' }}>
          <Tab icon={<ShoppingBag />} label="Список" active={view === ViewMode.LIST} onClick={() => setView(ViewMode.LIST)} />
          <Tab icon={<Sparkles />} label="Прогноз" active={view === ViewMode.PREDICTIONS} onClick={() => setView(ViewMode.PREDICTIONS)} />
          <Tab icon={<History />} label="История" active={view === ViewMode.HISTORY} onClick={() => setView(ViewMode.HISTORY)} />
        </nav>
      )}
    </div>
  );
};

const Tab = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] transition-all ${active ? 'scale-110 opacity-100' : 'opacity-30'}`} style={{ color: active ? 'var(--tg-primary)' : 'inherit' }}>
    {React.cloneElement(icon, { className: 'w-5 h-5' })}
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;