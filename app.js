// Globale Variablen
let allWords = [];
let filteredWords = [];
let currentIndex = 0;
let learnedWords = new Set();
let favoriteWords = new Set();
let reviewSchedule = {};
let isFlipped = false;
let currentMode = 'flashcard';
let quizScore = 0;
let quizAnswered = 0;
let typingScore = 0;
let typingAnswered = 0;
let dailyGoal = 10;
let todayStats = { date: new Date().toDateString(), learned: 0 };

// Fortschritt laden
function loadProgress() {
    const saved = localStorage.getItem('learnedWords');
    const savedFav = localStorage.getItem('favoriteWords');
    const savedReview = localStorage.getItem('reviewSchedule');
    const savedGoal = localStorage.getItem('dailyGoal');
    const savedToday = localStorage.getItem('todayStats');

    if (saved) learnedWords = new Set(JSON.parse(saved));
    if (savedFav) favoriteWords = new Set(JSON.parse(savedFav));
    if (savedReview) reviewSchedule = JSON.parse(savedReview);
    if (savedGoal) dailyGoal = parseInt(savedGoal);
    
    if (savedToday) {
        const parsed = JSON.parse(savedToday);
        if (parsed.date === new Date().toDateString()) {
            todayStats = parsed;
        } else {
            todayStats = { date: new Date().toDateString(), learned: 0 };
            saveProgress();
        }
    }
}

// Fortschritt speichern
function saveProgress() {
    localStorage.setItem('learnedWords', JSON.stringify([...learnedWords]));
    localStorage.setItem('favoriteWords', JSON.stringify([...favoriteWords]));
    localStorage.setItem('reviewSchedule', JSON.stringify(reviewSchedule));
    localStorage.setItem('dailyGoal', dailyGoal.toString());
    localStorage.setItem('todayStats', JSON.stringify(todayStats));
}

// Wörter laden
async function loadWords() {
    try {
        const response = await fetch('kelimeler_web.json');
        allWords = await response.json();
        initializeApp();
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        alert('Fehler beim Laden der Wörter!');
    }
}

// App initialisieren
function initializeApp() {
    loadProgress();
    populateFilters();
    applyFilters();
    updateStats();
    updateDailyGoal();
    showCard();
}

// Filter befüllen
function populateFilters() {
    const lektions = [...new Set(allWords.map(w => w.lektion))].sort((a, b) => a - b);
    const teils = [...new Set(allWords.map(w => w.teil))].sort((a, b) => a - b);

    console.log('Lektions gefunden:', lektions);
    console.log('Teils gefunden:', teils);

    const lektionSelect = document.getElementById('lektionFilter');
    if (!lektionSelect) {
        console.error('lektionFilter element nicht gefunden!');
        return;
    }
    
    lektions.forEach(l => {
        const option = document.createElement('option');
        option.value = l;
        option.textContent = `Lektion ${l}`;
        lektionSelect.appendChild(option);
    });

    const teilSelect = document.getElementById('teilFilter');
    if (!teilSelect) {
        console.error('teilFilter element nicht gefunden!');
        return;
    }
    
    teils.forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = `Teil ${t}`;
        teilSelect.appendChild(option);
    });
    
    console.log('Filter befüllt: ', lektions.length, 'Lektions,', teils.length, 'Teils');
}

// Filter anwenden
function applyFilters() {
    const lektionFilter = document.getElementById('lektionFilter').value;
    const teilFilter = document.getElementById('teilFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const favoriteFilter = document.getElementById('favoriteFilter').value;

    filteredWords = allWords.filter(word => {
        const matchLektion = lektionFilter === 'all' || word.lektion == lektionFilter;
        const matchTeil = teilFilter === 'all' || word.teil == teilFilter;
        const matchSearch = searchTerm === '' || 
            word.wort.toLowerCase().includes(searchTerm) ||
            word.grammatik.toLowerCase().includes(searchTerm) ||
            word.beispiel.toLowerCase().includes(searchTerm);
        
        let matchFavorite = true;
        if (favoriteFilter === 'favorites') {
            matchFavorite = favoriteWords.has(word.id);
        } else if (favoriteFilter === 'notLearned') {
            matchFavorite = !learnedWords.has(word.id);
        }
        
        return matchLektion && matchTeil && matchSearch && matchFavorite;
    });

    currentIndex = 0;
    updateStats();
    
    if (currentMode === 'flashcard') showCard();
    else if (currentMode === 'quiz') showQuiz();
    else if (currentMode === 'typing') showTypingQuiz();
    else if (currentMode === 'review') showReview();
}

// Statistiken aktualisieren
function updateStats() {
    document.getElementById('totalWords').textContent = filteredWords.length;
    document.getElementById('learnedWords').textContent = 
        filteredWords.filter(w => learnedWords.has(w.id)).length;
    document.getElementById('remainingWords').textContent = 
        filteredWords.filter(w => !learnedWords.has(w.id)).length;
    document.getElementById('favoriteWords').textContent = 
        filteredWords.filter(w => favoriteWords.has(w.id)).length;
}

// Tägliches Ziel
function updateDailyGoal() {
    document.getElementById('dailyGoalNumber').textContent = dailyGoal;
    document.getElementById('dailyGoalText').textContent = `${dailyGoal} Wörter`;
    document.getElementById('todayLearned').textContent = todayStats.learned;
    
    const progress = Math.min((todayStats.learned / dailyGoal) * 100, 100);
    document.getElementById('goalProgressFill').style.width = `${progress}%`;
}

// Karte anzeigen
function showCard() {
    // Yeni karta geçince ses/TTS durdur
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (filteredWords.length === 0) {
        document.getElementById('wordText').textContent = 'Keine Wörter gefunden';
        return;
    }

    const word = filteredWords[currentIndex];
    isFlipped = false;

    document.getElementById('wordText').textContent = word.wort;
    document.getElementById('lektionBadge').textContent = `Lektion ${word.lektion}`;
    document.getElementById('teilBadge').textContent = `Teil ${word.teil}`;

    document.getElementById('wordTextBack').textContent = word.wort;
    document.getElementById('grammarText').textContent = word.grammatik;
    document.getElementById('exampleText').textContent = word.beispiel;
    document.getElementById('lektionBadgeBack').textContent = `Lektion ${word.lektion}`;
    document.getElementById('teilBadgeBack').textContent = `Teil ${word.teil}`;

    document.getElementById('cardFront').classList.remove('hidden');
    document.getElementById('cardBack').classList.add('hidden');

    const favBtn = document.getElementById('favoriteBtn');
    favBtn.textContent = favoriteWords.has(word.id) ? '★' : '☆';
    favBtn.classList.toggle('active', favoriteWords.has(word.id));

    const progress = ((currentIndex + 1) / filteredWords.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    const learnedBtn = document.getElementById('markLearnedBtn');
    if (learnedWords.has(word.id)) {
        learnedBtn.textContent = '❌ Als ungelernt markieren';
        learnedBtn.classList.remove('btn-primary');
        learnedBtn.classList.add('btn-danger');
    } else {
        learnedBtn.textContent = '✅ Gelernt';
        learnedBtn.classList.remove('btn-danger');
        learnedBtn.classList.add('btn-primary');
    }
}

// Karte umdrehen
function flipCard() {
    isFlipped = !isFlipped;
    document.getElementById('cardFront').classList.toggle('hidden', isFlipped);
    document.getElementById('cardBack').classList.toggle('hidden', !isFlipped);

    // Arka yüze döndüğünde TTS ile beispiel oku (B2 sistemi gibi)
    if (isFlipped) {
        const word = filteredWords[currentIndex];
        if (word) _ttsSpeak([word.grammatik || "", word.beispiel || ""].filter(Boolean));
    } else {
        // Ön yüze döndüğünde TTS durdur
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
}

// ══════════════════════════════════════════════════
//  SES SİSTEMİ — B2 sitesindeki gibi
//  1) opus dosyası oynar
//  2) Bittikten sonra TTS: grammatik → beispiel okur
//  Arka yüzde: sadece beispiel okur
//  Mobil (iOS/Android) uyumlu
// ══════════════════════════════════════════════════

let _ttsVoice = null;
const _PREFERRED_VOICES = ["Karsten", "Hedda", "Katja", "Stefan"];

function _pickVoice() {
    const all = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!all.length) return null;
    // Masaüstü: Microsoft Almanca sesleri
    for (const name of _PREFERRED_VOICES) {
        const v = all.find(v => v.name.includes(name) && v.lang.startsWith("de"));
        if (v) return v;
    }
    // Mobil fallback: herhangi Almanca ses
    return all.find(v => v.lang === "de-DE")
        || all.find(v => v.lang.startsWith("de"))
        || null;
}

function _populateVoiceSelect() {
    const all = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!all.length) return;
    if (!_ttsVoice) _ttsVoice = _pickVoice();

    const sel = document.getElementById("voiceSelect");
    if (!sel) return;

    const deVoices = all.filter(v => v.lang.startsWith("de"));
    const preferred = _PREFERRED_VOICES
        .map(name => deVoices.find(v => v.name.includes(name)))
        .filter(Boolean);
    const list = preferred.length ? preferred : deVoices;
    if (!list.length) { sel.innerHTML = "<option value=''>Systemstimme</option>"; return; }

    const prev = sel.value;
    sel.innerHTML = "";
    list.forEach(v => {
        const o = document.createElement("option");
        o.value = v.name;
        o.textContent = v.name.replace("Microsoft ", "").replace(/ - German.*/, "").replace(/ \(Natural\).*/, "");
        if (_ttsVoice && v.name === _ttsVoice.name) o.selected = true;
        else if (v.name === prev) o.selected = true;
        sel.appendChild(o);
    });
}

function _setVoice(name) {
    const all = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    _ttsVoice = all.find(v => v.name === name) || _ttsVoice;
}

// Ses seçici başlat
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = _populateVoiceSelect;
    _populateVoiceSelect();
    [300, 800, 1500, 3000].forEach(ms => setTimeout(_populateVoiceSelect, ms));
}

// TTS — ardışık parçaları sıraya dizer
function _ttsSpeak(parts) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const list = parts.map(p => (p || "").trim()).filter(Boolean);
    if (!list.length) return;

    // Ses seçiciden güncel seçimi oku
    const sel = document.getElementById("voiceSelect");
    if (sel && sel.value) {
        const found = window.speechSynthesis.getVoices().find(v => v.name === sel.value);
        if (found) _ttsVoice = found;
    }
    if (!_ttsVoice) _ttsVoice = _pickVoice();

    let idx = 0;
    function next() {
        if (idx >= list.length) return;
        const u = new SpeechSynthesisUtterance(list[idx++]);
        if (_ttsVoice) { u.voice = _ttsVoice; u.lang = _ttsVoice.lang; }
        else            { u.lang = "de-DE"; }
        u.rate   = 0.9;
        u.pitch  = 1;
        u.volume = 1;
        u.onend  = next;
        u.onerror = next;
        window.speechSynthesis.speak(u);
        // iOS workaround: paused kalırsa resume et
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }
    next();
}

// Ana ses fonksiyonu — B2 sistemiyle aynı mantık
// isFront=true  → opus oynar, bittikten sonra TTS(grammatik + beispiel)
// isFront=false → sadece TTS(beispiel)
function playAudio(audioFile, wort, grammatik, beispiel, isFront) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (isFront === false) {
        // Arka yüz: grammatik + beispiel oku
        _ttsSpeak([grammatik || "", beispiel || ""].filter(Boolean));
        return;
    }

    // Ön yüz: önce opus, opus bittikten sonra TTS(wort + grammatik + beispiel)
    const ttsAfter = [wort || "", grammatik || "", beispiel || ""].filter(Boolean);

    if (audioFile) {
        const audio = new Audio(`sesler/${audioFile}`);
        const btn = document.getElementById("audioBtn");
        if (btn) btn.classList.add("playing");

        let ttsStarted = false;
        const startTTS = () => {
            if (ttsStarted) return;  // çift tetiklenmeyi önle
            ttsStarted = true;
            if (btn) btn.classList.remove("playing");
            if (ttsAfter.length) _ttsSpeak(ttsAfter);
        };

        audio.onended = startTTS;
        audio.onerror = startTTS;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(startTTS);
        }
    } else {
        // Opus yoksa direkt TTS
        if (ttsAfter.length) _ttsSpeak(ttsAfter);
    }
}

// Quiz anzeigen
function showQuiz() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (filteredWords.length === 0) return;

    const correctWord = filteredWords[currentIndex];
    const wrongWords = allWords.filter(w => w.id !== correctWord.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [correctWord, ...wrongWords].sort(() => Math.random() - 0.5);

    document.getElementById('quizWord').textContent = correctWord.wort;
    
    const container = document.getElementById('quizOptions');
    container.innerHTML = '';

    options.forEach(option => {
        const div = document.createElement('div');
        div.className = 'quiz-option';
        div.textContent = option.beispiel;
        div.onclick = () => checkQuizAnswer(option.id === correctWord.id, div);
        container.appendChild(div);
    });

    const progress = ((currentIndex + 1) / filteredWords.length) * 100;
    document.getElementById('quizProgressFill').style.width = `${progress}%`;
}

// Quiz-Antwort prüfen
function checkQuizAnswer(isCorrect, element) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.style.pointerEvents = 'none');

    if (isCorrect) {
        element.classList.add('correct');
        quizScore++;
    } else {
        element.classList.add('wrong');
        options.forEach(opt => {
            if (opt.textContent === filteredWords[currentIndex].beispiel) {
                opt.classList.add('correct');
            }
        });
    }

    quizAnswered++;
    document.getElementById('quizScore').textContent = `Punktzahl: ${quizScore}/${quizAnswered}`;

    setTimeout(() => {
        if (currentIndex < filteredWords.length - 1) {
            currentIndex++;
            showQuiz();
        } else {
            alert(`Quiz abgeschlossen!\nPunktzahl: ${quizScore}/${quizAnswered}\nProzent: ${Math.round((quizScore/quizAnswered)*100)}%`);
        }
    }, 2000);
}

// Typing Quiz
function showTypingQuiz() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (filteredWords.length === 0) return;

    const word = filteredWords[currentIndex];
    document.getElementById('typingGrammar').textContent = word.grammatik;
    document.getElementById('typingExample').textContent = word.beispiel;
    
    const input = document.getElementById('typingInput');
    input.value = '';
    input.className = 'typing-quiz-input';
    input.disabled = false;
    input.readOnly = false;
    
    // UI-Fix: Sicherstellen, dass das Input-Feld klickbar und fokussierbar ist
    input.style.pointerEvents = 'auto';
    input.style.zIndex = '100';
    
    // Focus auf Input setzen
    setTimeout(() => {
        input.focus();
        // Fallback falls der erste Fokus fehlschlägt
        if (document.activeElement !== input) {
            input.click();
            input.focus();
        }
    }, 200);
    
    const progress = ((currentIndex + 1) / filteredWords.length) * 100;
    document.getElementById('typingProgressFill').style.width = `${progress}%`;
}

function checkTypingAnswer() {
    const word = filteredWords[currentIndex];
    const input = document.getElementById('typingInput');
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = word.wort.toLowerCase();

    typingAnswered++;

    if (userAnswer === correctAnswer) {
        input.classList.add('correct');
        typingScore++;
        setTimeout(() => {
            if (currentIndex < filteredWords.length - 1) {
                currentIndex++;
                showTypingQuiz();
            } else {
                alert(`Schreib-Quiz abgeschlossen!\nPunktzahl: ${typingScore}/${typingAnswered}\nProzent: ${Math.round((typingScore/typingAnswered)*100)}%`);
            }
        }, 1500);
    } else {
        input.classList.add('wrong');
        input.value = `Falsch! Richtig: ${word.wort}`;
        input.disabled = true;
        setTimeout(() => {
            if (currentIndex < filteredWords.length - 1) {
                currentIndex++;
                showTypingQuiz();
            } else {
                alert(`Schreib-Quiz abgeschlossen!\nPunktzahl: ${typingScore}/${typingAnswered}\nProzent: ${Math.round((typingScore/typingAnswered)*100)}%`);
            }
        }, 2500);
    }

    document.getElementById('typingScore').textContent = `Punktzahl: ${typingScore}/${typingAnswered}`;
}

// Wiederholung
function showReview() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const today = new Date().toDateString();
    const wordsToReview = filteredWords.filter(w => {
        const schedule = reviewSchedule[w.id];
        return schedule && schedule.nextReview <= today && learnedWords.has(w.id);
    });

    if (wordsToReview.length === 0) {
        document.getElementById('reviewWord').textContent = 'Keine Wörter zur Wiederholung heute! 🎉';
        document.getElementById('reviewGrammar').textContent = '';
        document.getElementById('reviewExample').textContent = '';
        return;
    }

    const word = wordsToReview[currentIndex % wordsToReview.length];
    document.getElementById('reviewWord').textContent = word.wort;
    document.getElementById('reviewGrammar').textContent = word.grammatik;
    document.getElementById('reviewExample').textContent = word.beispiel;

    const favBtn = document.getElementById('reviewFavoriteBtn');
    favBtn.textContent = favoriteWords.has(word.id) ? '★' : '☆';

    const progress = ((currentIndex + 1) / wordsToReview.length) * 100;
    document.getElementById('reviewProgressFill').style.width = `${progress}%`;
}

function rateReview(difficulty) {
    const today = new Date();
    const word = filteredWords[currentIndex];
    
    let interval = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 3 : 1;
    const nextReview = new Date(today);
    nextReview.setDate(nextReview.getDate() + interval);

    reviewSchedule[word.id] = {
        lastReview: today.toDateString(),
        nextReview: nextReview.toDateString(),
        interval: interval
    };

    saveProgress();

    if (currentIndex < filteredWords.length - 1) {
        currentIndex++;
        showReview();
    } else {
        alert('Wiederholung abgeschlossen! 🎉');
    }
}

// Favorit
function toggleFavorite() {
    const word = filteredWords[currentIndex];
    if (favoriteWords.has(word.id)) {
        favoriteWords.delete(word.id);
    } else {
        favoriteWords.add(word.id);
    }
    saveProgress();
    updateStats();
    if (currentMode === 'flashcard') showCard();
    else if (currentMode === 'review') showReview();
}

// Gelernt markieren
function markAsLearned() {
    const word = filteredWords[currentIndex];
    if (learnedWords.has(word.id)) {
        learnedWords.delete(word.id);
        delete reviewSchedule[word.id];
    } else {
        learnedWords.add(word.id);
        todayStats.learned++;
        
        const today = new Date();
        const nextReview = new Date(today);
        nextReview.setDate(nextReview.getDate() + 1);
        
        reviewSchedule[word.id] = {
            lastReview: today.toDateString(),
            nextReview: nextReview.toDateString(),
            interval: 1
        };
    }
    saveProgress();
    updateStats();
    updateDailyGoal();
    showCard();
}

// Statistiken anzeigen
function showStats() {
    document.getElementById('statTotal').textContent = allWords.length;
    document.getElementById('statLearned').textContent = learnedWords.size;
    document.getElementById('statFavorites').textContent = favoriteWords.size;
    document.getElementById('statToday').textContent = todayStats.learned;
    document.getElementById('statProgress').textContent = 
        `${Math.round((learnedWords.size / allWords.length) * 100)}%`;

    const lektions = [...new Set(allWords.map(w => w.lektion))].sort((a, b) => a - b);
    const chartContainer = document.getElementById('lektionChart');
    chartContainer.innerHTML = '';

    lektions.forEach(lektion => {
        const wordsInLektion = allWords.filter(w => w.lektion === lektion);
        const learnedInLektion = wordsInLektion.filter(w => learnedWords.has(w.id)).length;
        const percentage = (learnedInLektion / wordsInLektion.length) * 100;

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${percentage}%`;
        
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = `L${lektion}`;
        
        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = `${learnedInLektion}/${wordsInLektion.length}`;
        
        bar.appendChild(label);
        bar.appendChild(value);
        chartContainer.appendChild(bar);
    });

    document.getElementById('statsModal').classList.remove('hidden');
}

// Event Listeners
document.getElementById('flashcard').addEventListener('click', (e) => {
    if (!e.target.closest('.favorite-btn') && !e.target.closest('.audio-btn')) {
        flipCard();
    }
});

document.getElementById('favoriteBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite();
});

document.getElementById('reviewFavoriteBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite();
});

document.getElementById('audioBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const word = filteredWords[currentIndex];
    // isFront: kartın şu anki durumuna göre
    playAudio(word?.audio, word?.wort, word?.grammatik, word?.beispiel, !isFlipped);
});

document.getElementById('quizAudioBtn').addEventListener('click', () => {
    const word = filteredWords[currentIndex];
    playAudio(word?.audio, word?.wort, word?.grammatik, word?.beispiel, true);
});

document.getElementById('typingAudioBtn').addEventListener('click', () => {
    const word = filteredWords[currentIndex];
    playAudio(word?.audio, word?.wort, word?.grammatik, word?.beispiel, true);
});

document.getElementById('reviewAudioBtn').addEventListener('click', () => {
    const word = filteredWords[currentIndex];
    playAudio(word?.audio, word?.wort, word?.grammatik, word?.beispiel, true);
});

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentIndex < filteredWords.length - 1) {
        currentIndex++;
        showCard();
    }
});

document.getElementById('typingCheckBtn').addEventListener('click', checkTypingAnswer);

document.getElementById('typingSkipBtn').addEventListener('click', () => {
    if (currentIndex < filteredWords.length - 1) {
        currentIndex++;
        showTypingQuiz();
    }
});

document.getElementById('typingInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkTypingAnswer();
});

document.getElementById('reviewHardBtn').addEventListener('click', () => rateReview('hard'));
document.getElementById('reviewMediumBtn').addEventListener('click', () => rateReview('medium'));
document.getElementById('reviewEasyBtn').addEventListener('click', () => rateReview('easy'));

document.getElementById('markLearnedBtn').addEventListener('click', markAsLearned);

document.getElementById('shuffleBtn').addEventListener('click', () => {
    filteredWords.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    if (currentMode === 'flashcard') showCard();
    else if (currentMode === 'quiz') showQuiz();
    else if (currentMode === 'typing') showTypingQuiz();
    else if (currentMode === 'review') showReview();
});

document.getElementById('statsBtn').addEventListener('click', showStats);

document.getElementById('closeStatsBtn').addEventListener('click', () => {
    document.getElementById('statsModal').classList.add('hidden');
});

document.getElementById('statsModal').addEventListener('click', (e) => {
    if (e.target.id === 'statsModal') {
        document.getElementById('statsModal').classList.add('hidden');
    }
});

document.getElementById('resetProgressBtn').addEventListener('click', () => {
    if (confirm('Der gesamte Fortschritt wird zurückgesetzt. Sind Sie sicher?')) {
        learnedWords.clear();
        favoriteWords.clear();
        reviewSchedule = {};
        todayStats = { date: new Date().toDateString(), learned: 0 };
        saveProgress();
        updateStats();
        updateDailyGoal();
        showCard();
    }
});

document.getElementById('lektionFilter').addEventListener('change', applyFilters);
document.getElementById('teilFilter').addEventListener('change', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('favoriteFilter').addEventListener('change', applyFilters);

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        currentMode = tab.dataset.mode;
        currentIndex = 0;

        document.getElementById('flashcardMode').classList.add('hidden');
        document.getElementById('quizMode').classList.add('hidden');
        document.getElementById('typingMode').classList.add('hidden');
        document.getElementById('reviewMode').classList.add('hidden');

        if (currentMode === 'flashcard') {
            document.getElementById('flashcardMode').classList.remove('hidden');
            showCard();
        } else if (currentMode === 'quiz') {
            document.getElementById('quizMode').classList.remove('hidden');
            quizScore = 0;
            quizAnswered = 0;
            document.getElementById('quizScore').textContent = 'Punktzahl: 0/0';
            showQuiz();
        } else if (currentMode === 'typing') {
            document.getElementById('typingMode').classList.remove('hidden');
            typingScore = 0;
            typingAnswered = 0;
            document.getElementById('typingScore').textContent = 'Punktzahl: 0/0';
            showTypingQuiz();
        } else if (currentMode === 'review') {
            document.getElementById('reviewMode').classList.remove('hidden');
            showReview();
        }
    });
});

// Tastaturkürzel
document.addEventListener('keydown', (e) => {
    if (currentMode === 'flashcard') {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            showCard();
        } else if (e.key === 'ArrowRight' && currentIndex < filteredWords.length - 1) {
            currentIndex++;
            showCard();
        } else if (e.key === ' ') {
            e.preventDefault();
            flipCard();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const word = filteredWords[currentIndex];
            playAudio(word?.audio, word?.wort, word?.grammatik, word?.beispiel, !isFlipped);
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFavorite();
        }
    }
});

// App starten
loadWords();
;