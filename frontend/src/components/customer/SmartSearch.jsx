import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Search, Sparkles, Loader2, AlertTriangle, X, Lightbulb, Store, Scale,
} from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ReservationModal } from './ReservationModal';
import { BargainModal } from './BargainModal';
import { useCompare } from './CompareContext';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { productService } from '../../services/productService';
import { chatService } from '../../services/chatService';
import { getSehoreDemoData } from './sehoreDemoData';
import { formatDistance } from './compareUtils';
import { getRoutedShopId, isUuidLike } from './customerItemUtils';
import {
  searchCatalogue,
  describeIntent,
  isDemoRegion,
} from './smartSearchUtils';

const EXAMPLE_QUERIES = [
  'cheap LED bulb under 200',
  'something to fix a leaking pipe',
  'notebooks for school under 100',
  'medicine for fever',
  'earphones under 500',
  'dawai for sardi',
];

// Merged corpus (live API products + demo catalogue) is cached for 5 minutes
// so repeated searches don't hammer the backend.
let corpusCache = { products: null, fetchedAt: 0 };
const CORPUS_TTL = 5 * 60 * 1000;

const loadCorpus = async () => {
  if (corpusCache.products && Date.now() - corpusCache.fetchedAt < CORPUS_TTL) {
    return corpusCache.products;
  }
  let apiProducts = [];
  try {
    const res = await productService.getProducts();
    if (res?.success && Array.isArray(res.products)) apiProducts = res.products;
  } catch {
    // Live catalogue unavailable — fall back to the demo catalogue only.
    apiProducts = [];
  }
  const { products: demoProducts } = getSehoreDemoData();
  const seen = new Set();
  const corpus = [];
  [...apiProducts, ...demoProducts].forEach((product) => {
    const key = String(product._id || product.id || product.name || '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    corpus.push(product);
  });
  corpusCache = { products: corpus, fetchedAt: Date.now() };
  return corpus;
};

const VOICE_ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was denied. Allow mic permission in your browser and try again.',
  'service-not-allowed': 'Microphone access is blocked by the browser settings.',
  'no-speech': 'No speech detected — tap the mic and try again.',
  'audio-capture': 'No microphone was found on this device.',
  network: 'Speech recognition needs a network connection.',
  'language-not-supported': 'This speech language is not supported by your browser.',
};

export const SmartSearch = () => {
  const { coordinates, addressText, radiusKm } = useLocation();
  const { isInCompare, toggleCompare } = useCompare();
  const { isAuthenticated } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [reserveTarget, setReserveTarget] = useState(null);
  const [bargainTarget, setBargainTarget] = useState(null);

  // --- Voice typing (Web Speech API) ---------------------------------------
  const SpeechRecognitionCtor =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-IN');

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* recognition already stopped */
      }
    }
  }, []);

  // Stop the microphone when the component unmounts.
  useEffect(() => () => stopListening(), [stopListening]);

  const startListening = () => {
    setVoiceError('');
    if (!SpeechRecognitionCtor) {
      setVoiceError('Voice typing is not supported in this browser. Try Chrome or Edge, or type your search.');
      return;
    }
    if (listening) {
      stopListening();
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInterimText(interim.trim());
      if (finalText.trim()) {
        // Append to the existing query instead of auto-submitting, so the user
        // stays in control of when the search runs.
        setQuery((previous) => (previous.trim() ? `${previous.trim()} ${finalText.trim()}` : finalText.trim()));
        setInterimText('');
      }
    };
    recognition.onerror = (event) => {
      setVoiceError(VOICE_ERROR_MESSAGES[event.error] || 'Voice input failed. Please type your search instead.');
      setListening(false);
      setInterimText('');
    };
    recognition.onend = () => {
      setListening(false);
      setInterimText('');
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setVoiceError('Could not start voice input. Please try again.');
    }
  };

  const changeVoiceLang = (lang) => {
    setVoiceLang(lang);
    if (listening) stopListening();
  };

  // --- Search execution -----------------------------------------------------
  const runSearch = async (rawQuery) => {
    const trimmed = String(rawQuery || '').trim();
    if (!trimmed) {
      setResult(null);
      setStatus('idle');
      setErrorMessage('');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    try {
      const corpus = await loadCorpus();
      const searchResult = searchCatalogue(corpus, trimmed, {
        coordinates,
        radiusKm,
        demoRegion: isDemoRegion(coordinates, addressText),
      });
      setResult(searchResult);
      setStatus('done');
    } catch {
      setErrorMessage('Search failed to load products. Please try again.');
      setStatus('error');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runSearch(query);
  };

  const handleChatClick = async (product) => {
    if (!isAuthenticated) {
      addToast('Please log in to chat with the shopkeeper.', 'info');
      navigate('/login');
      return;
    }
    // Demo listings route to the linked live partner shop, so chat opens for
    // every listing instead of being blocked.
    const shopIdValue = getRoutedShopId(product);
    if (!shopIdValue || !isUuidLike(shopIdValue)) {
      addToast(
        'This listing is not linked to a live shop chat yet. Broadcast a request to get quotes from nearby shops.',
        'error',
        6000
      );
      return;
    }
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: shopIdValue,
        productName: product.name || product.product_name,
        price: product.price,
      });
      if (res?.success && res.conversation?._id) {
        navigate(`/customer/messages?c=${res.conversation._id}`);
      } else {
        addToast(res?.message || 'Could not start a chat with this shop. Please try again.', 'error');
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Failed to open chat. Please try again.',
        'error'
      );
    }
  };

  const intentChips = result ? describeIntent(result.parsed) : [];
  const hasNoResults = status === 'done' && result && result.matches.length === 0;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4" aria-label="Smart product search">
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className="p-2 rounded-xl bg-brand-50 text-brand-600"><Sparkles className="w-4 h-4" /></span>
        <div>
          <h2 className="font-black text-slate-900 text-sm">Smart Search</h2>
          <p className="text-xs text-slate-500">Describe what you need — “something to fix a leaking pipe under ₹500”. Voice typing supported.</p>
        </div>
      </div>

      {/* Search bar + mic */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={listening ? 'Listening…' : 'What do you need today?'}
            aria-label="Search products"
            className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
          />
          {query && !listening && (
            <button type="button" onClick={() => { setQuery(''); setResult(null); setStatus('idle'); }} aria-label="Clear search" className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={startListening}
          aria-pressed={listening}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          title={listening ? 'Stop voice input' : 'Voice typing'}
          className={`p-2.5 rounded-2xl border flex-shrink-0 transition-colors ${
            listening
              ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => changeVoiceLang(voiceLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
          title={`Voice language: ${voiceLang === 'en-IN' ? 'English (India)' : 'Hindi'} — tap to switch`}
          className="p-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 flex-shrink-0 text-[10px] font-black uppercase"
        >
          {voiceLang === 'en-IN' ? 'EN' : 'हि'}
        </button>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold flex-shrink-0 flex items-center gap-1.5"
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {/* Voice status / errors */}
      {listening && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          <span>{interimText ? `Heard: “${interimText}”` : 'Listening… speak now, then press Search.'}</span>
        </div>
      )}
      {voiceError && (
        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{voiceError}</span>
        </div>
      )}

      {/* Example queries */}
      {status === 'idle' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Try:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => { setQuery(example); runSearch(example); }}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-[11px] font-semibold border border-slate-200"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* Loading / error states */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching nearby shops…
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Something went wrong</p>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => runSearch(query)} className="underline font-bold">Try again</button>
          </div>
        </div>
      )}

      {/* Empty state with alternatives */}
      {hasNoResults && (
        <div className="space-y-3">
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
            {result.parsed.budgetMax != null
              ? `No products matched “${result.parsed.rawQuery}”. Try removing the budget filter or searching a nearby shop's inventory directly.`
              : `No products matched “${result.parsed.rawQuery}”. You can broadcast this as a request so nearby shops can quote you.`}
            {intentChips.length > 0 && (
              <p className="mt-1 text-slate-500">We read your search as: {intentChips.join(' • ')}.</p>
            )}
          </div>
          {result.alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Closest alternatives in stock</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {result.alternatives.map((product) => (
                  <ProductCard
                    key={product._id || product.id}
                    product={product}
                    onReserveClick={setReserveTarget}
                    onBargain={setBargainTarget}
                    onChatClick={handleChatClick}
                    onCompareToggle={toggleCompare}
                    isCompared={isInCompare(product._id || product.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && result.matches.length > 0 && (
        <div className="space-y-4">
          {/* What the search understood */}
          {intentChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Understood as:</span>
              {intentChips.map((chip) => (
                <span key={chip} className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-100">{chip}</span>
              ))}
            </div>
          )}

          {/* Same product, multiple shops — compare view */}
          {result.multiShopGroups.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Scale className="w-3 h-3" /> Same product, multiple shops — cheapest first
              </p>
              {result.multiShopGroups.map((group, groupIndex) => (
                <div key={group[0].product._id || groupIndex} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                  <p className="text-xs font-black text-slate-800">{group[0].product.name}</p>
                  {group.map((match) => (
                    <div key={match.product._id} className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-100 px-3 py-2">
                      <div className="min-w-0">
                        <Link to={`/shops/${match.product.shopId._id || match.product.shopId}`} className="text-xs font-bold text-slate-700 hover:text-brand-600 flex items-center gap-1 truncate">
                          <Store className="w-3 h-3 text-slate-400" /> {match.product.shopId.shopName || 'Local Shop'}
                        </Link>
                        <p className="text-[10px] text-slate-500 truncate">
                          {match.reasons.slice(0, 2).join(' • ')}
                          {match.distanceKm != null ? ` • ${formatDistance(match.distanceKm)} away` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-black text-slate-900">₹{match.product.price}</span>
                        {!match.inStock && <span className="text-[10px] font-bold text-rose-600">Out of stock</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Ranked product grid */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              {result.matches.length} result{result.matches.length === 1 ? '' : 's'} ranked by relevance
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {result.matches.map((match) => (
                <div key={match.product._id || match.product.id} className="space-y-1">
                  <ProductCard
                    product={match.product}
                    onReserveClick={setReserveTarget}
                    onBargain={setBargainTarget}
                    onChatClick={handleChatClick}
                    onCompareToggle={toggleCompare}
                    isCompared={isInCompare(match.product._id || match.product.id)}
                  />
                  <p className="text-[10px] text-slate-500 px-1 leading-snug">
                    {match.overBudget && <span className="font-bold text-amber-700">Over budget • </span>}
                    {match.reasons[0]}
                    {match.reasons.length > 1 ? ` +${match.reasons.length - 1} more` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action modals */}
      <ReservationModal
        isOpen={Boolean(reserveTarget)}
        onClose={() => setReserveTarget(null)}
        targetItem={reserveTarget}
      />
      <BargainModal
        product={bargainTarget}
        isOpen={Boolean(bargainTarget)}
        onClose={() => setBargainTarget(null)}
      />
    </section>
  );
};
