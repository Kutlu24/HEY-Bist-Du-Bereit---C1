let allWords = [];
let filteredWords = [];
let currentIndex = 0;
let learnedWords = new Set();
let favoriteWords = new Set();
let selectedLanguage = '';
let currentMode = 'flashcard';
let quizScore = { correct: 0, total: 0 };

const dom = {
    languageSelection: document.getElementById('languageSelection'),
    mainApp: document.getElementById('mainApp'),
    currentLangFlag: document.getElementById('currentLangFlag'),
    currentLangName: document.getElementById('currentLangName'),
    totalWords: document.getElementById('totalWords'),
    learnedWords: document.getElementById('learnedWords'),
    remainingWords: document.getElementById('remainingWords'),
    favoriteWords: document.getElementById('favoriteWords'),
    kapitelFilter: document.getElementById('kapitelFilter'),
    searchInput: document.getElementById('searchInput'),
    favoriteFilter: document.getElementById('favoriteFilter'),
    flashcard: document.getElementById('flashcard'),
    cardFront: document.getElementById('cardFront'),
    cardBack: document.getElementById('cardBack'),
    wordText: document.getElementById('wordText'),
    wordTextBack: document.getElementById('wordTextBack'),
    translationText: document.getElementById('translationText'),
    exampleText: document.getElementById('exampleText'),
    kapitelBadge: document.getElementById('kapitelBadge'),
    kapitelBadgeBack: document.getElementById('kapitelBadgeBack'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    progressFill: document.getElementById('progressFill'),
    quizMode: document.getElementById('quizMode'),
    flashcardMode: document.getElementById('flashcardMode'),
    quizWord: document.getElementById('quizWord'),
    quizOptions: document.getElementById('quizOptions'),
    quizScore: document.getElementById('quizScore'),
    quizProgressFill: document.getElementById('quizProgressFill')
};

// --- Initialization ---

async function init() {
    try {
        const response = await fetch('aspekt_neu_c1.json');
        allWords = await response.json();
        
        loadProgress();
        setupKapitelFilter();
        checkLanguageSelection();
        
        setupEventListeners();
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        alert("Fehler beim Laden der Vokabeln.");
    }
}

function checkLanguageSelection() {
    const savedLang = localStorage.getItem('aspektSelectedLanguage');
    if (savedLang) {
        const langData = JSON.parse(savedLang);
        applyLanguage(langData.id, langData.flag, langData.name);
    } else {
        dom.languageSelection.style.display = 'flex';
        dom.mainApp.style.display = 'none';
    }
}

function selectLanguage(id, flag, name) {
    const langData = { id, flag, name };
    localStorage.setItem('aspektSelectedLanguage', JSON.stringify(langData));
    applyLanguage(id, flag, name);
}

function applyLanguage(id, flag, name) {
    selectedLanguage = id;
    dom.currentLangFlag.textContent = flag;
    dom.currentLangName.textContent = name;
    
    dom.languageSelection.style.display = 'none';
    dom.mainApp.style.display = 'block';
    
    updateFilteredWords();
    updateUI();
}

function changeLanguage() {
    localStorage.removeItem('aspektSelectedLanguage');
    dom.mainApp.style.display = 'none';
    dom.languageSelection.style.display = 'flex';
}

// --- Data Management ---

function loadProgress() {
    const learned = localStorage.getItem('aspektLearnedWords');
    if (learned) learnedWords = new Set(JSON.parse(learned));
    
    const favorites = localStorage.getItem('aspektFavoriteWords');
    if (favorites) favoriteWords = new Set(JSON.parse(favorites));
}

function saveProgress() {
    localStorage.setItem('aspektLearnedWords', JSON.stringify([...learnedWords]));
    localStorage.setItem('aspektFavoriteWords', JSON.stringify([...favoriteWords]));
}

function setupKapitelFilter() {
    const kapitelSet = new Set(allWords.map(w => w.kapitel));
    const sortedKapitel = [...kapitelSet].sort((a, b) => a - b);
    
    sortedKapitel.forEach(k => {
        const option = document.createElement('option');
        option.value = k;
        option.textContent = `Kapitel ${k}`;
        dom.kapitelFilter.appendChild(option);
    });
}

function updateFilteredWords() {
    const kapitel = dom.kapitelFilter.value;
    const search = dom.searchInput.value.toLowerCase();
    const filterType = dom.favoriteFilter.value;
    
    filteredWords = allWords.filter(w => {
        const matchesKapitel = kapitel === 'all' || w.kapitel.toString() === kapitel;
        const matchesSearch = w.deutsch.toLowerCase().includes(search) || 
                             (w[selectedLanguage] && w[selectedLanguage].toLowerCase().includes(search));
        const matchesFilter = filterType === 'all' || 
                             (filterType === 'favorites' && favoriteWords.has(w.id)) ||
                             (filterType === 'notLearned' && !learnedWords.has(w.id));
        
        return matchesKapitel && matchesSearch && matchesFilter;
    });
    
    currentIndex = 0;
    updateUI();
}

// --- UI Updates ---

function updateUI() {
    dom.totalWords.textContent = allWords.length;
    dom.learnedWords.textContent = learnedWords.size;
    dom.remainingWords.textContent = allWords.length - learnedWords.size;
    dom.favoriteWords.textContent = favoriteWords.size;
    
    if (currentMode === 'flashcard') {
        showCurrentWord();
    } else {
        showCurrentQuiz();
    }
}

function showCurrentWord() {
    if (filteredWords.length === 0) {
        dom.wordText.textContent = "Keine Wörter gefunden";
        dom.translationText.textContent = "";
        dom.exampleText.textContent = "";
        dom.kapitelBadge.textContent = "-";
        dom.progressFill.style.width = '0%';
        return;
    }
    
    const word = filteredWords[currentIndex];
    dom.wordText.textContent = word.deutsch;
    dom.wordTextBack.textContent = word.deutsch;
    dom.translationText.textContent = word[selectedLanguage] || "Keine Übersetzung";
    dom.exampleText.textContent = word.beispiel || "Kein Beispiel vorhanden.";
    dom.kapitelBadge.textContent = `Kapitel ${word.kapitel}`;
    dom.kapitelBadgeBack.textContent = `Kapitel ${word.kapitel}`;
    
    dom.favoriteBtn.textContent = favoriteWords.has(word.id) ? '★' : '☆';
    dom.favoriteBtn.style.color = favoriteWords.has(word.id) ? '#fbbf24' : '#ccc';
    
    const progress = ((currentIndex + 1) / filteredWords.length) * 100;
    dom.progressFill.style.width = `${progress}%`;
    
    // Reset card state
    dom.cardFront.classList.remove('hidden');
    dom.cardBack.classList.add('hidden');
}

// --- Event Handlers ---

function setupEventListeners() {
    // Mode Switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.mode;
            
            if (currentMode === 'flashcard') {
                dom.flashcardMode.classList.remove('hidden');
                dom.quizMode.classList.add('hidden');
            } else {
                dom.flashcardMode.classList.add('hidden');
                dom.quizMode.classList.remove('hidden');
                quizScore = { correct: 0, total: 0 };
                updateQuizScore();
            }
            updateUI();
        });
    });

    // Filtering
    dom.kapitelFilter.addEventListener('change', updateFilteredWords);
    dom.searchInput.addEventListener('input', updateFilteredWords);
    dom.favoriteFilter.addEventListener('change', updateFilteredWords);

    // Flashcard Actions
    dom.flashcard.addEventListener('click', (e) => {
        if (e.target.id === 'favoriteBtn') return;
        dom.cardFront.classList.toggle('hidden');
        dom.cardBack.classList.toggle('hidden');
    });

    dom.favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = filteredWords[currentIndex];
        if (!word) return;
        
        if (favoriteWords.has(word.id)) {
            favoriteWords.delete(word.id);
        } else {
            favoriteWords.add(word.id);
        }
        saveProgress();
        updateUI();
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentIndex < filteredWords.length - 1) {
            currentIndex++;
            updateUI();
        }
    });

    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateUI();
        }
    });

    document.getElementById('markLearnedBtn').addEventListener('click', () => {
        const word = filteredWords[currentIndex];
        if (!word) return;
        
        if (learnedWords.has(word.id)) {
            learnedWords.delete(word.id);
        } else {
            learnedWords.add(word.id);
        }
        saveProgress();
        updateUI();
    });

    document.getElementById('shuffleBtn').addEventListener('click', () => {
        filteredWords.sort(() => Math.random() - 0.5);
        currentIndex = 0;
        updateUI();
    });

    document.getElementById('resetProgressBtn').addEventListener('click', () => {
        if (confirm("Möchten Sie Ihren gesamten Fortschritt für dieses Modul wirklich zurücksetzen?")) {
            learnedWords.clear();
            favoriteWords.clear();
            saveProgress();
            updateUI();
        }
    });

    // Quiz Actions
    document.getElementById('quizNextBtn').addEventListener('click', () => {
        if (currentIndex < filteredWords.length - 1) {
            currentIndex++;
            updateUI();
        }
    });

    document.getElementById('quizPrevBtn').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateUI();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (dom.mainApp.style.display === 'none') return;
        if (document.activeElement.tagName === 'INPUT') return;

        if (currentMode === 'flashcard') {
            if (e.code === 'ArrowRight') document.getElementById('nextBtn').click();
            if (e.code === 'ArrowLeft') document.getElementById('prevBtn').click();
            if (e.code === 'Space') dom.flashcard.click();
            if (e.code === 'KeyF') dom.favoriteBtn.click();
            if (e.code === 'Enter') document.getElementById('markLearnedBtn').click();
        }
    });
}

// --- Quiz Logic ---

function showCurrentQuiz() {
    if (filteredWords.length < 4) {
        dom.quizWord.textContent = "Nicht genug Wörter für ein Quiz (min. 4 benötigt)";
        dom.quizOptions.innerHTML = "";
        return;
    }

    const correctWord = filteredWords[currentIndex];
    dom.quizWord.textContent = correctWord.deutsch;
    
    // Generate options
    let options = [correctWord];
    while (options.length < 4) {
        const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
        if (!options.find(o => o.id === randomWord.id)) {
            options.push(randomWord);
        }
    }
    
    options.sort(() => Math.random() - 0.5);
    
    dom.quizOptions.innerHTML = "";
    options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'quiz-option';
        btn.textContent = opt[selectedLanguage] || "???";
        btn.addEventListener('click', () => handleQuizAnswer(btn, opt.id === correctWord.id));
        dom.quizOptions.appendChild(btn);
    });

    const progress = ((currentIndex + 1) / filteredWords.length) * 100;
    dom.quizProgressFill.style.width = `${progress}%`;
}

function handleQuizAnswer(element, isCorrect) {
    if (element.parentElement.querySelector('.correct') || element.parentElement.querySelector('.wrong')) return;

    quizScore.total++;
    if (isCorrect) {
        element.classList.add('correct');
        quizScore.correct++;
        
        // Auto mark as learned if correct? Let's make it manual to be safe, or 
        // maybe a small delay before next word
        setTimeout(() => {
            if (currentIndex < filteredWords.length - 1) {
                currentIndex++;
                updateUI();
            }
        }, 1500);
    } else {
        element.classList.add('wrong');
        // Show correct answer
        Array.from(dom.quizOptions.children).forEach(child => {
            const word = filteredWords[currentIndex];
            if (child.textContent === word[selectedLanguage]) {
                child.classList.add('correct');
            }
        });
    }
    updateQuizScore();
}

function updateQuizScore() {
    dom.quizScore.textContent = `Punktzahl: ${quizScore.correct}/${quizScore.total}`;
}

// Global exposure for HTML onclicks
window.selectLanguage = selectLanguage;
window.changeLanguage = changeLanguage;

init();