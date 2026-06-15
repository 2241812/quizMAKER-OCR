const QUIZ_NAME = typeof EXAM_NAME !== 'undefined' ? EXAM_NAME : (typeof DATA_FILE !== 'undefined' ? DATA_FILE.match(/(\w+)(?=\.json)/)?.[1] || 'quiz' : 'quiz');
const SAVE_KEY = `quiz-save-${QUIZ_NAME}`;

const state = {
    data: null,
    currentIndex: 0,
    questionOrder: [],
    answers: [],
    questionTimes: [],
    questionStartTime: null,
    answered: false,
    popupOpen: false,
    totalAvailable: 0,
    activeCount: 0,
    retryMode: false,
    retryMapping: [],
    skippedIndices: [],
    inSkippedRound: false
};

document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    if (!document.getElementById('screen-start')) return;
    await loadQuiz();
    setupKeyboard();
    checkResume();
});

async function loadQuiz() {
    try {
        const dataFile = typeof DATA_FILE !== 'undefined' ? DATA_FILE : 'main/data/quiz_data.json';
        const res = await fetch(dataFile);
        state.data = await res.json();
        state.totalAvailable = state.data.questions.length;
        document.getElementById('total-questions').textContent = state.totalAvailable;
        const allOption = document.querySelector('#count-select option[value="0"]');
        if (allOption) allOption.textContent = `All ${state.totalAvailable}`;
    } catch (err) {
        document.getElementById('question-text').textContent = 'Failed to load quiz data.';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('quiz-theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    const saved = localStorage.getItem('quiz-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    }
}

function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (state.popupOpen) {
            if (e.key === 'Enter') {
                e.preventDefault();
                dismissPopup();
            }
            return;
        }

        if (state.answered && e.key === 'Enter') {
            e.preventDefault();
            return;
        }

        if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const idx = parseInt(e.key) - 1;
            const choices = document.querySelectorAll('.choice-btn');
            if (choices[idx] && !choices[idx].disabled) {
                choices[idx].click();
            }
        }

        const keyMap = { a: 0, b: 1, c: 2, d: 3 };
        const key = e.key.toLowerCase();
        if (key in keyMap) {
            e.preventDefault();
            const idx = keyMap[key];
            const choices = document.querySelectorAll('.choice-btn');
            if (choices[idx] && !choices[idx].disabled) {
                choices[idx].click();
            }
        }
    });
}

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screen}`);
    target.classList.add('active');
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function saveState() {
    const saveData = {
        currentIndex: state.currentIndex,
        questionOrder: state.questionOrder,
        answers: state.answers,
        questionTimes: state.questionTimes,
        activeCount: state.activeCount,
        retryMode: state.retryMode,
        retryMapping: state.retryMapping,
        skippedIndices: state.skippedIndices,
        inSkippedRound: state.inSkippedRound,
        answered: state.answered,
        timestamp: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function loadSavedState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function clearSavedState() {
    localStorage.removeItem(SAVE_KEY);
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.style.display = 'none';
}

function checkResume() {
    const saved = loadSavedState();
    const resumeBtn = document.getElementById('resume-btn');
    if (!resumeBtn) return;

    if (saved && state.data) {
        const answered = Object.keys(saved.answers).filter(k => saved.answers[k] !== null).length;
        const total = saved.activeCount || saved.questionOrder.length;
        resumeBtn.textContent = `Resume Last Quiz (${answered}/${total})`;
        resumeBtn.style.display = 'inline-block';
    } else {
        resumeBtn.style.display = 'none';
    }
}

function resumeQuiz() {
    const saved = loadSavedState();
    if (!saved || !state.data) return;

    state.currentIndex = saved.currentIndex;
    state.questionOrder = saved.questionOrder;
    state.answers = saved.answers || {};
    state.questionTimes = saved.questionTimes || {};
    state.activeCount = saved.activeCount;
    state.retryMode = saved.retryMode || false;
    state.retryMapping = saved.retryMapping || [];
    state.skippedIndices = saved.skippedIndices || [];
    state.inSkippedRound = saved.inSkippedRound || false;
    state.answered = false;
    state.popupOpen = false;
    state.questionStartTime = null;

    document.getElementById('popup-panel').classList.remove('visible');
    showScreen('quiz');
    renderQuestion();
}

function startQuiz() {
    const saved = loadSavedState();
    if (saved) {
        const proceed = confirm('You have a quiz in progress. Starting a new quiz will discard it. Continue?');
        if (!proceed) return;
    }

    clearSavedState();

    const countVal = parseInt(document.getElementById('count-select').value);
    const count = countVal === 0 ? state.totalAvailable : countVal;
    const takeCount = Math.min(count, state.totalAvailable);

    const indices = shuffleArray(Array.from({ length: state.totalAvailable }, (_, i) => i));
    state.questionOrder = indices.slice(0, takeCount);
    state.activeCount = state.questionOrder.length;
    state.currentIndex = 0;
    state.retryMode = false;
    state.retryMapping = [];
    state.skippedIndices = [];
    state.inSkippedRound = false;
    state.answers = {};
    state.questionTimes = {};
    state.questionStartTime = null;
    state.answered = false;
    state.popupOpen = false;

    document.getElementById('popup-panel').classList.remove('visible');
    showScreen('quiz');
    renderQuestion();
}

function getActiveQuestionList() {
    if (state.inSkippedRound) {
        return state.skippedIndices.map(i => ({
            qIndex: i,
            question: state.data.questions[i]
        }));
    }
    return state.questionOrder.map(i => ({
        qIndex: i,
        question: state.data.questions[i]
    }));
}

function getCurrentQuestion() {
    return getActiveQuestionList()[state.currentIndex];
}

function renderQuestion() {
    const list = getActiveQuestionList();
    const total = list.length;
    const index = state.currentIndex;
    const entry = list[index];
    const q = entry.question;
    const globalIdx = entry.qIndex;

    document.getElementById('question-number').textContent = `Question ${index + 1} of ${total}`;
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('progress-bar').style.width = `${(index / total) * 100}%`;

    document.getElementById('popup-panel').classList.remove('visible');

    const skipBtn = document.getElementById('skip-btn');
    skipBtn.style.display = state.inSkippedRound ? 'none' : 'inline-block';
    skipBtn.textContent = state.answers[globalIdx] ? 'Skipped' : 'Skip';

    const questionCard = document.getElementById('question-card');
    questionCard.classList.remove('question-enter', 'question-exit');
    void questionCard.offsetWidth;
    questionCard.classList.add('question-enter');

    const choicesEl = document.getElementById('choices');
    choicesEl.innerHTML = '';

    const labels = ['A', 'B', 'C', 'D'];
    q.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.dataset.index = i;
        btn.style.animationDelay = `${i * 50}ms`;
        btn.innerHTML = `<span class="choice-label">${labels[i]}</span><span class="choice-text">${choice}</span>`;
        btn.addEventListener('click', () => selectAnswer(i));
        choicesEl.appendChild(btn);
    });

    document.getElementById('feedback').className = 'feedback';
    state.answered = false;
    state.questionStartTime = Date.now();

    saveState();
}

function selectAnswer(index) {
    if (state.answered || state.popupOpen) return;

    const entry = getCurrentQuestion();
    const q = entry.question;
    const globalIdx = entry.qIndex;
    const selected = q.choices[index];
    const correct = q.answer;

    state.answered = true;
    state.answers[globalIdx] = selected;
    state.questionTimes[globalIdx] = (Date.now() - state.questionStartTime) / 1000;

    if (globalIdx in state.skippedIndices) {
        const skipPos = state.skippedIndices.indexOf(globalIdx);
        if (skipPos !== -1) state.skippedIndices.splice(skipPos, 1);
    }

    const choices = document.querySelectorAll('.choice-btn');
    choices.forEach((btn, i) => {
        if (q.choices[i] === correct) btn.classList.add('correct');
        if (i === index && q.choices[i] !== correct) btn.classList.add('wrong');
        btn.disabled = true;
    });

    saveState();

    if (selected === correct) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = 'Correct!';
        feedback.className = 'feedback correct visible';
        setTimeout(() => animateToNextQuestion(), 1000);
    } else {
        showWrongPopup(q, selected, correct);
    }
}

function skipQuestion() {
    if (state.answered || state.popupOpen || state.inSkippedRound) return;

    const entry = getCurrentQuestion();
    const globalIdx = entry.qIndex;
    state.answers[globalIdx] = null;
    state.questionTimes[globalIdx] = (Date.now() - state.questionStartTime) / 1000;

    if (!state.skippedIndices.includes(globalIdx)) {
        state.skippedIndices.push(globalIdx);
    }

    saveState();
    animateToNextQuestion();
}

function animateToNextQuestion() {
    const questionCard = document.getElementById('question-card');
    questionCard.classList.remove('question-enter');
    questionCard.classList.add('question-exit');

    setTimeout(() => {
        advanceQuestion();
    }, 250);
}

function advanceQuestion() {
    const list = getActiveQuestionList();
    state.currentIndex++;

    if (state.currentIndex >= list.length) {
        if (!state.inSkippedRound && state.skippedIndices.length > 0) {
            state.inSkippedRound = true;
            state.currentIndex = 0;
            renderQuestion();
        } else {
            showResults();
        }
    } else {
        renderQuestion();
    }
}

function generateExplanation(q, selected, correct) {
    const termMap = buildTermDefinitions(q);
    const wrongDef = termMap[selected.toLowerCase()] || buildFallbackDef(selected, q.question, false);
    const correctDef = termMap[correct.toLowerCase()] || buildFallbackDef(correct, q.question, true);
    const insight = buildInsight(q.question, selected, correct);
    return { wrongDef, correctDef, insight };
}

function buildTermDefinitions(q) {
    const map = {};
    const descMatch = q.question.match(/^(?:A|An|The|What|Which|How)\s+(?:is\s+a|is\s+an|is\s+the|do|does|are|of|type\s+of|do\s+you\s+call)\s+(.+?)\?$/i);
    const desc = descMatch ? descMatch[1].trim().replace(/^(.+?)(?:\s+where\s+|\s+that\s+|\s+which\s+|\s+used\s+)/i, '$1 - ') : q.question.replace(/\?$/, '');

    q.choices.forEach(c => {
        const cLower = c.toLowerCase();
        if (c === q.answer) {
            map[cLower] = `"${c}" is the correct answer. The question describes: ${desc}. This term directly matches the definition or function being asked about.`;
        } else {
            map[cLower] = `"${c}" is a related term in this domain, but it does not match the specific description. ${extractDistinction(q.question, c, q.answer)}`;
        }
    });
    return map;
}

function extractDistinction(question, wrong, correct) {
    const q = question.toLowerCase();
    const c = correct.toLowerCase();

    if (q.includes('whirlpool') && c.includes('vortex'))
        return `The question mentions a "whirlpool motion" which directly corresponds to the "vortex" concept in "${correct}". "${wrong}" uses a different flushing mechanism (simple gravity wash-down) that does not involve a whirlpool.`;
    if (q.includes('cleaning private parts') && c.includes('bidet'))
        return `A bidet is specifically designed for cleaning private parts with a water spray. "${wrong}" serves a different purpose.`;
    if (q.includes('control, isolation and repair') && c.includes('valves'))
        return `The question mentions "control, isolation and repair" which are functions of valves. "${wrong}" serve a different role in the system.`;
    if (q.includes('male threaded') && c.includes('nipple'))
        return `A nipple is a pipe fitting with male threads on both ends. "${wrong}" is a different type of fitting used for connecting pipes.`;
    if (q.includes('backflow') || q.includes('negative pressure'))
        return `The question describes a specific phenomenon related to negative pressure. "${correct}" is the precise term for water flowing backward due to negative pressure.`;
    if (q.includes('waste water') && !q.includes('fecal'))
        return `The question specifies "free of fecal matter," which distinguishes waste pipes from soil pipes that carry human waste.`;
    if (q.includes('circulation of air') && (q.includes('trap seals') || q.includes('trap seal')))
        return `The question describes air circulation to relieve pressure on trap seals — vent pipes are specifically designed for this purpose.`;
    if (q.includes('liquid seal') && q.includes('prevents'))
        return `A trap is specifically designed to maintain a liquid seal that prevents foul air from entering the building.`;
    if (q.includes('vertical main') && q.includes('extending through'))
        return `A stack is the vertical main pipe extending through multiple stories. "${wrong}" is a different component.`;
    if (q.includes('lowest horizontal') && q.includes('receives'))
        return `The house drain is the lowest horizontal pipe receiving all drainage inside the building before it goes outside.`;
    if (q.includes('0.60 meters') || q.includes('outside face'))
        return `The house sewer begins at the foundation wall and extends to the street sewer or discharge point.`;
    if (q.includes('deleterious') || q.includes('hazardous'))
        return `An interceptor is designed to separate hazardous or undesirable matters from normal wastes before disposal.`;
    if (q.includes('balanced atmospheric pressure'))
        return `Ventilation in plumbing maintains balanced atmospheric pressure to prevent trap seal loss.`;
    if (q.includes('highest horizontal drain') && q.includes('stack'))
        return `A stack vent is the extension of a soil or waste stack above the highest connected drain.`;
    if (q.includes('vertical vent') && q.includes('circulation of air'))
        return `A vent stack is the vertical pipe providing air circulation to the drainage system.`;
    if (q.includes('uppermost') && q.includes('above the roof'))
        return `The vent stack through roof refers specifically to the portion extending above the roofline.`;
    if (q.includes('does not connect directly') && q.includes('discharging into'))
        return `An indirect waste pipe discharges into a fixture or receptacle rather than directly connecting to the drainage system.`;
    if (q.includes('prevent') && q.includes('back flows'))
        return `A backflow valve is specifically designed to prevent backflow in house drains.`;
    if (q.includes('pumps') && q.includes('sump') && q.includes('sewers'))
        return `Sewage ejectors pump waste from basement sump pits to higher-elevation sewers.`;
    if (q.includes('grease') && (q.includes('quantities') || q.includes('line stoppage')))
        return `A grease trap intercepts grease before it enters the drainage system to prevent stoppages.`;
    if (q.includes('minus') && q.includes('plus pressure'))
        return `Siphonage is the direct effect of pressure imbalances due to inadequate venting.`;
    if (q.includes('wastewater also flows'))
        return `A wet vent carries both wastewater and air, unlike a dry vent which only carries air.`;
    if (q.includes('does not carry') && q.includes('wastes'))
        return `A dry vent only carries air — no liquid or water-borne wastes pass through it.`;
    if (q.includes('downstream') && q.includes('last fixture'))
        return `A looped vent turns above the highest fixture overflow level, used in spaces without partitions.`;
    if (q.includes('starts in front') && q.includes('extreme fixture'))
        return `A circuit vent starts before the highest fixture connection on a horizontal branch.`;
    if (q.includes('additional circulation') && q.includes('auxiliary'))
        return `A relief vent provides extra air circulation between drainage and vent systems.`;
    if (q.includes('one vent') && q.includes('two traps'))
        return `A unit vent serves two traps with a single vent pipe.`;
    if (q.includes('removable plug') && q.includes('access'))
        return `A cleanout provides access for inspection or repair via a removable plug.`;
    if (q.includes('principal artery') && q.includes('venting system'))
        return `The main vent is the primary vent pipe to which all vent branches connect.`;
    if (q.includes('connect straight pipe') || q.includes('different sizes'))
        return `A fitting is a general term for components used to connect pipes, adapt sizes, or regulate flow.`;
    if (q.includes('art and technique') && q.includes('installing pipes'))
        return `Plumbing is the art and technique of installing pipes, fixtures, and apparatuses for water supply and drainage.`;
    if (q.includes('dug') && q.includes('15 meters'))
        return `A shallow well is typically manually dug and around 15 meters deep.`;
    if (q.includes('immersible'))
        return `A submersible pump is designed to operate fully submerged in a tank or media.`;
    if (q.includes('completely close') || q.includes('completely open'))
        return `A gate valve is used for full open or full close operation, not for regulating flow.`;
    if (q.includes('prevent reversal'))
        return `A check valve automatically prevents reverse flow in a piping system.`;
    if (q.includes('extending vertically') && q.includes('one full story'))
        return `A riser is a vertical pipe extending one or more stories to convey water to fixtures.`;
    if (q.includes('street water main') || q.includes('source of water'))
        return `A service pipe brings water from the street main or source into the building.`;
    if (q.includes('measure') && q.includes('gallons') && q.includes('water'))
        return `A water meter measures the volume of water passing through the service line.`;
    if (q.includes('wash down action') && q.includes('trapway at the front'))
        return `A washdown water closet uses a simple wash-down action with the trapway at the front of the bowl.`;
    if (q.includes('siphon action') && q.includes('trapway'))
        return `A reverse trap water closet uses siphon action through the trapway for flushing.`;
    if (q.includes('watertight') && q.includes('separates solids') && q.includes('digest'))
        return `A septic tank is a watertight receptacle that separates solids, digests organic matter, and clarifies liquids.`;
    if (q.includes('human wastes') && !q.includes('plus'))
        return `Grey water is wastewater excluding human wastes (sinks, showers, etc.).`;
    if (q.includes('plus solid') && q.includes('liquid human wastes'))
        return `Black water contains both liquid and solid human wastes from toilets.`;
    if (q.includes('rain water'))
        return `Storm water is the term for rainwater that falls on a property.`;
    if (q.includes('loosely lined') && q.includes('septic tank') && q.includes('seep'))
        return `A seepage pit receives septic tank effluent and allows it to seep through the pit bottom and sides.`;
    if (q.includes('non-watertight') && q.includes('retain') && q.includes('seep'))
        return `A cesspool is a non-watertight pit that retains solids but lets liquids seep into the ground.`;
    if (q.includes('not part of') && q.includes('water supply') && q.includes('fire'))
        return `A standpipe is a dedicated pipe for firefighting, not part of the regular water supply or drainage system.`;
    if (q.includes('1.20M') && q.includes('fire department'))
        return `A dry standpipe is empty until connected to a fire department pumper at the exterior connection.`;
    if (q.includes('directly connected') && q.includes('main water line'))
        return `A wet standpipe is constantly filled with water from the main supply line.`;
    if (q.includes('stairway') || q.includes('standpipes should be'))
        return `Standpipes should be located at stairway landings for easy access during emergencies.`;
    if (q.includes('6m') || q.includes('23m') || q.includes('nozzle'))
        return `The code requires that all building areas be within 6 meters of a nozzle on a 23-meter hose.`;
    if (q.includes('sprinkler pipes') && (q.includes('3') || q.includes('6')))
        return `Sprinkler pipes must be spaced 3 to 6 meters apart according to code requirements.`;
    if (q.includes('twin-inlet') || q.includes('twin inlet'))
        return `A Siamese twin connection has a twin-inlet fitting that allows multiple fire hoses to feed water into the system simultaneously.`;
    if (q.includes('on top of the branch line') || q.includes('pointing upwards'))
        return `An upright sprinkler head is mounted on top of the branch line piping and points upward, deflecting water downward in an umbrella pattern.`;
    if (q.includes('pointing downwards') || q.includes('downwards from the branch'))
        return `A pendent sprinkler head hangs down from the branch line piping and sprays water in a circular pattern below the ceiling.`;
    if (q.includes('basement parking'))
        return `Upright sprinklers are suitable for basement parking where obstructions and ceiling exposure require upward-facing heads.`;
    if (q.includes('freeze') && q.includes('inoperable'))
        return `Dry sprinkler systems are used in areas where pipes may freeze, as they contain pressurized air or nitrogen instead of water.`;
    if (q.includes('offices') && q.includes('sprinkler head'))
        return `Pendent sprinkler heads are best for offices as they hang from the ceiling and provide optimal coverage for finished spaces.`;
    if (q.includes('does not use gutter') || q.includes('downspout'))
        return `A natural storm water system relies on ground absorption and natural drainage without gutters or downspouts.`;
    if (q.includes('directly to the reservoir'))
        return `An independent storm water system collects and channels rainwater directly to a reservoir.`;
    if (q.includes('combines storm') && q.includes('sanitary'))
        return `A combined system mixes storm water runoff with sanitary sewage in the same piping network.`;
    if (q.includes('roofing element') && q.includes('collecting rainwater') && q.includes('perimeter'))
        return `A gutter is the roofing element along the roof perimeter that collects and channels rainwater.`;
    if (q.includes('manually operated') && q.includes('alarm'))
        return `A fire alarm station is a manually operated device that initiates an alarm signal when activated.`;
    if (q.includes('malfunction') && q.includes('trouble bell'))
        return `Circuit supervision detects wiring faults in alarm devices and sounds a trouble bell to indicate malfunction.`;
    if (q.includes('long') && q.includes('narrow') && q.includes('cable trays'))
        return `A linear heat detector is designed for long, narrow applications like cable trays and conveyors.`;
    if (q.includes('long range') && q.includes('milliseconds'))
        return `Ultraviolet radiation detectors are long-range, rapid-response flame detectors sensitive to most fire types.`;
    if (q.includes('electromagnetic coil') && q.includes('vibrate'))
        return `A buzzer uses an electromagnetic coil to vibrate a thin metal piece and produce sound.`;
    if (q.includes('electric motor') && q.includes('high-pitched'))
        return `A siren uses an electric motor to produce a continuous high-pitched sound up to 100 dB.`;
    if (q.includes('beam interruption') && q.includes('insects'))
        return `A photoelectric device uses a beam of light that, when interrupted, triggers an alarm.`;
    if (q.includes('spring mounted') && q.includes('sonic booms'))
        return `A mechanical motion detector uses a spring-mounted contact that can be triggered by vibrations, including wind and passing trucks.`;
    if (q.includes('interconnected') && q.includes('direct path to earth'))
        return `Grounding provides a direct path to earth for fault currents to protect people and equipment.`;
    if (q.includes('unit of measurement') && q.includes('electric current'))
        return `Amperes (amps) measure the flow rate of electric charge — the electric current.`;
    if (q.includes('galvanized steel') && q.includes('BX'))
        return `Armored cable (BX) has a galvanized steel spiral metal sheath for protection in dry indoor locations.`;
    if (q.includes('entire course') && q.includes('from the source'))
        return `A circuit is the complete path an electric current travels from source through a device and back.`;
    if (q.includes('good conductor') && q.includes('most commonly used'))
        return `Copper is the most common conductor for electrical wires due to its excellent conductivity and durability.`;
    if (q.includes('several light fixtures') && q.includes('branch off'))
        return `Parallel wiring allows multiple fixtures or receptacles on the same circuit with individual branch connections.`;
    if (q.includes('automatically operated electrical switch') && q.includes('overload'))
        return `A circuit breaker automatically interrupts current flow when it detects overload or short circuit conditions.`;
    if (q.includes('elevator') && q.includes('speed') && q.includes('excessive'))
        return `A governor is a safety device that stops an elevator car if it exceeds its rated speed.`;
    if (q.includes('elevator pit') && q.includes('cushioned stop'))
        return `Buffers in the elevator pit provide a cushioned stop if the car over-travels below the lowest landing.`;
    if (q.includes('simpler') && q.includes('floor space') && q.includes('display'))
        return `Crisscross escalator arrangement uses less floor space and is commonly used in retail for merchandise displays.`;
    if (q.includes('ejection lift') && q.includes('food carts'))
        return `An automated dumbwaiter (ejection lift) is ideal for delivering food carts, linens, and bulk containers.`;
    if (q.includes('vertical shaft') && q.includes('pit') && q.includes('hoistway'))
        return `A hoistway is the vertical shaft for elevator travel including the pit and extending to the machine room.`;
    if (q.includes('base of the hoistway') && q.includes('hydraulic'))
        return `The machine room for hydraulic elevators is typically at the base of the hoistway, housing the pump and controls.`;
    if (q.includes('welded steel frame') && q.includes('step rollers'))
        return `The truss is a welded steel frame that supports the escalator apparatus and guides the step rollers.`;
    if (q.includes('flattened pallet') && q.includes('similar to an escalator'))
        return `A moving walk uses a flattened pallet instead of steps but is otherwise similar to an escalator.`;
    if (q.includes('manual and automatic detection'))
        return `Active fire protection includes both automatic and manual systems like sprinklers and fire alarms.`;
    if (q.includes('average time') && q.includes('lobby') && q.includes('upper floor'))
        return `Average trip time measures the mean time passengers spend from arrival in the lobby to exiting at an upper floor.`;
    if (q.includes('one place') && q.includes('distributes') && q.includes('zone'))
        return `A centralized HVAC system is located in one place and distributes heating/cooling to specific zones.`;
    if (q.includes('disadvantages') && q.includes('maintenance') && q.includes('cleaning'))
        return `Local HVAC systems have higher maintenance demands and require regular cleaning to maintain air quality.`;
    if (q.includes('eliminates') && q.includes('distribution trees'))
        return `Direct refrigerant HVAC systems eliminate air and water distribution networks by placing units adjacent to or within the conditioned space.`;
    if (q.includes('carries air') && q.includes('dampers'))
        return `Ducts carry air to and from conditioned spaces and incorporate dampers to direct and modulate airflow.`;
    if (q.includes('condensers') && q.includes('evaporators'))
        return `A heat exchanger transfers heat between fluids and includes condensers, evaporators, and coils.`;
    if (q.includes('general combinations') && q.includes('comfort'))
        return `The preliminary design phase considers the most common comfort needs and climate conditions.`;
    if (q.includes('applies one') && q.includes('design alternatives'))
        return `The evaluation phase selects the most promising combination of aesthetic, social, and technical solutions.`;
    if (q.includes('critical decision') && q.includes('sizing') && q.includes('heating'))
        return `Proper specification is the critical decision in sizing heating equipment to meet demand.`;
    if (q.includes('allow') && q.includes('airflow') && q.includes('cut off'))
        return `Dampers control airflow in ducts and can be operated manually or automatically.`;
    if (q.includes('gases') && q.includes('compressed') && q.includes('liquefied') && q.includes('heat absorbers'))
        return `Refrigerants are substances that absorb heat by being compressed and liquefied, then expanded in HVAC systems.`;
    if (q.includes('perpetuation') && q.includes('reflected sound'))
        return `Reverberation is the persistence of reflected sound in a space after the original sound source stops.`;
    if (q.includes('airborne sound'))
        return `Airborne sound includes conversation, outdoor noise, and music — any sound that travels through the air.`;
    if (q.includes('travelling') && q.includes('solid building'))
        return `Structure-borne sound travels through solid building components like floors, walls, and ductwork.`;
    if (q.includes('science of sound'))
        return `Acoustics is the scientific study of sound and its behavior.`;
    if (q.includes('controlling sound') && q.includes('buildings'))
        return `Architectural acoustics is the science of controlling sound within buildings for optimal hearing conditions.`;

    return `"${wrong}" is a different term from "${correct}" in this context. The question's description specifically matches "${correct}" rather than "${wrong}".`;
}

function buildFallbackDef(term, question, isCorrect) {
    const q = question.replace(/\?$/, '').trim();
    if (isCorrect) {
        return `"${term}" is the correct answer. The question describes: ${q}. This term directly corresponds to the description.`;
    }
    return `"${term}" does not correctly match the description in the question. The question asks about: ${q}. Consider how the specific details in the question point to a different answer.`;
}

function buildInsight(question, wrong, correct) {
    const q = question.toLowerCase();
    const c = correct.toLowerCase();

    if (q.includes('whirlpool') && c.includes('vortex'))
        return `The key clue is "whirlpool motion" — this directly points to the "vortex" concept in "${correct}". "${wrong}" uses a different flushing mechanism (simple gravity wash-down) that does not involve a whirlpool.`;
    if (q.includes('cleaning private parts'))
        return `"${wrong}" is a general fixture for hand-washing, while "${correct}" is specifically designed for cleaning private parts with features like directed water spray.`;
    if (q.includes('male threaded'))
        return `The question specifically says "male threaded (threads are outside)." A nipple has external threads on both ends. "${wrong}" is a fitting that connects two pipes but does not have the same threading configuration.`;
    if (q.includes('backflow') || q.includes('negative pressure'))
        return `The critical phrase is "negative pressure." Back siphonage specifically refers to backflow caused by negative pressure in the supply pipe. This distinguishes it from other types of backflow.`;
    if (q.includes('free of fecal matter'))
        return `The key distinction is "free of fecal matter." A waste pipe carries only liquid waste without feces. A soil pipe carries human waste (fecal matter). Remember: waste = no feces, soil = with feces.`;
    if (q.includes('circulation of air') && (q.includes('trap seals') || q.includes('trap seal')))
        return `The question asks about relieving pressure on trap seals through air circulation. Vent pipes specifically serve this purpose. Other options relate to waste conveyance, not air circulation.`;
    if (q.includes('liquid seal') && q.includes('prevents'))
        return `The trap is a fitting that maintains a water seal to block foul air. This is its primary and defining function — the water "traps" the gases in the pipe.`;
    if (q.includes('vertical main') && q.includes('extending through'))
        return `"Stack" is the specific term for a vertical main pipe extending through multiple stories. "${wrong}" is a different component — remember: stacks are vertical, mains are horizontal.`;
    if (q.includes('lowest horizontal') && q.includes('receives'))
        return `"House drain" is the lowest horizontal pipe inside the building that collects all drainage. "${wrong}" starts outside the building. The key boundary is the foundation wall.`;
    if (q.includes('0.60') || q.includes('outside face'))
        return `The transition from house drain to house sewer happens at 0.60m from the foundation wall. Inside = house drain, outside = house sewer.`;
    if (q.includes('deleterious') || q.includes('hazardous'))
        return `An "interceptor" is the general term for devices that separate hazardous or undesirable materials from waste. A grease trap is a type of interceptor, but the question asks for the general category.`;
    if (q.includes('balanced atmospheric pressure'))
        return `"Ventilation" in plumbing specifically means maintaining balanced air pressure. Don't confuse this with HVAC ventilation — in plumbing, ventilation prevents trap seal loss.`;
    if (q.includes('highest horizontal drain') && q.includes('stack'))
        return `"Stack vent" = extension of the stack above the highest drain connection. "${wrong}" is a separate vertical vent pipe, not an extension of the soil/waste stack.`;
    if (q.includes('uppermost') && q.includes('above the roof'))
        return `"Vent stack through roof" is the traditional term for the portion of the vent stack that extends above the roofline.`;
    if (q.includes('does not connect directly'))
        return `"Indirect" is the key word. An indirect waste pipe does NOT connect directly to the drainage system. It discharges into a fixture or receptacle first.`;
    if (q.includes('prevent') && q.includes('back flows'))
        return `"Backflow valve" is specifically designed to prevent backflow in drainage systems. The name literally describes its function.`;
    if (q.includes('pumps') && q.includes('sump'))
        return `"Sewage ejectors" pump waste UP from below-grade sump pits to reach higher sewers. The word "ejector" implies forcefully ejecting waste upward.`;
    if (q.includes('grease') && (q.includes('quantities') || q.includes('line stoppage')))
        return `"Grease trap" is specifically designed to capture grease before it enters the drainage system. The word "trap" here means it captures/retains grease.`;
    if (q.includes('minus') && q.includes('plus'))
        return `"Siphonage" is the direct result of positive and negative pressure imbalances caused by inadequate venting on traps. The clue is "direct effect."`;
    if (q.includes('twin-inlet') || q.includes('twin inlet'))
        return `The key phrase is "twin-inlet fitting." A Siamese twin connection specifically features this dual-inlet design, allowing two fire hoses to connect simultaneously for increased water flow.`;
    if (q.includes('on top of the branch line') || q.includes('pointing upwards'))
        return `The key detail is "on top of the branch line piping, pointing upwards." This precisely describes an upright sprinkler head — it sits on top of the pipe and deflects water downward.`;
    if (q.includes('pointing downwards') || q.includes('downwards from the branch'))
        return `The key detail is "pointing downwards from the branch line piping." A pendent sprinkler hangs below the pipe. Remember: pendent = pendant = hanging down.`;

    return `Think about the specific wording of the question. Each term in this domain has a precise definition. "${correct}" is the term that exactly matches the description. "${wrong}" may be related to the general topic but has a different specific meaning or application.`;
}

function showWrongPopup(q, selected, correct) {
    state.popupOpen = true;
    const exp = generateExplanation(q, selected, correct);

    document.getElementById('popup-wrong-answer').textContent = selected;
    document.getElementById('popup-correct-answer').textContent = correct;
    document.getElementById('popup-wrong-def').textContent = exp.wrongDef;
    document.getElementById('popup-correct-def').textContent = exp.correctDef;
    document.getElementById('popup-insight').textContent = exp.insight;

    const suffix = typeof SEARCH_SUFFIX !== 'undefined' ? SEARCH_SUFFIX : 'building utilities plumbing';
    const wrongLink = document.getElementById('search-link-wrong');
    wrongLink.href = `https://www.google.com/search?q=${encodeURIComponent(selected + ' ' + suffix)}`;
    const correctLink = document.getElementById('search-link-correct');
    correctLink.href = `https://www.google.com/search?q=${encodeURIComponent(correct + ' ' + suffix)}`;

    document.getElementById('popup-panel').classList.add('visible');
    document.getElementById('popup-got-it').focus();
}

function dismissPopup() {
    document.getElementById('popup-panel').classList.remove('visible');
    state.popupOpen = false;
    animateToNextQuestion();
}

function showResults() {
    showScreen('results');
    state.popupOpen = false;
    document.getElementById('popup-panel').classList.remove('visible');

    clearSavedState();

    const questions = state.data.questions;
    const total = state.activeCount;
    let correct = 0;

    state.questionOrder.forEach(i => {
        const answer = state.answers[i];
        if (answer && answer === questions[i].answer) correct++;
    });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const times = Object.values(state.questionTimes);
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = times.length > 0 ? totalTime / times.length : 0;

    document.getElementById('score-text').textContent = `${correct}/${total}`;
    document.getElementById('percentage').textContent = `${score}%`;
    document.getElementById('accuracy-bar').style.width = `${score}%`;
    document.getElementById('avg-time').textContent = `${avgTime.toFixed(1)}s`;
    document.getElementById('total-time').textContent = formatTime(totalTime);
    document.getElementById('correct-count').textContent = correct;

    document.querySelector('.score-circle').style.setProperty('--pct', `${score}%`);

    const wrongList = document.getElementById('wrong-list');
    wrongList.innerHTML = '';
    let hasWrong = false;

    state.questionOrder.forEach(i => {
        const answer = state.answers[i];
        if (answer && answer !== questions[i].answer) {
            hasWrong = true;
            const q = questions[i];
            const item = document.createElement('div');
            item.className = 'wrong-item';
            item.innerHTML = `
                <div class="wrong-question">${q.question}</div>
                <div class="wrong-answers">
                    <div class="wrong-answer">Your answer: ${answer}</div>
                    <div class="correct-answer">Correct: ${q.answer}</div>
                </div>
            `;
            wrongList.appendChild(item);
        }
    });

    document.getElementById('wrong-review-section').style.display = hasWrong ? 'block' : 'none';
    document.getElementById('retry-btn').style.display = hasWrong ? 'inline-block' : 'none';
}

function retryIncorrect() {
    state.retryMapping = [];
    state.questionOrder.forEach(i => {
        const answer = state.answers[i];
        if (answer !== state.data.questions[i].answer) {
            state.retryMapping.push(i);
        }
    });

    if (state.retryMapping.length === 0) return;

    state.questionOrder = [...state.retryMapping];
    state.activeCount = state.questionOrder.length;
    state.currentIndex = 0;
    state.retryMode = true;
    state.answered = false;
    state.popupOpen = false;
    state.skippedIndices = [];
    state.inSkippedRound = false;
    state.answers = {};
    state.questionTimes = {};

    document.getElementById('popup-panel').classList.remove('visible');
    showScreen('quiz');
    renderQuestion();
}

function formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}
