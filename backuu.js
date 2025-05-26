// User and quiz state
let users = JSON.parse(localStorage.getItem('users') || '{}');
let currentUser = "";
let selectedCategory = "sports";
let quizData = [];
let current = 0;
let score = 0;

let globalTimeSeconds = 60 * 60; // 60 minutes
let globalTimerInterval;

// Function to switch between pages
function togglePage(target) {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("signupPage").classList.add("hidden");
  document.getElementById("categoryPage").classList.add("hidden");
  document.getElementById("quizPage").classList.add("hidden");
  document.getElementById("summaryPage").classList.add("hidden");

  if (target === "login") document.getElementById("loginPage").classList.remove("hidden");
  else if (target === "signup") document.getElementById("signupPage").classList.remove("hidden");
  else if (target === "category") document.getElementById("categoryPage").classList.remove("hidden");
  else if (target === "quiz") document.getElementById("quizPage").classList.remove("hidden");
  else if (target === "summary") document.getElementById("summaryPage").classList.remove("hidden");
}

// Category selection handlers
document.querySelectorAll(".category").forEach(cat => {
  cat.addEventListener("click", () => {
    selectedCategory = cat.dataset.category;
    document.querySelectorAll(".category").forEach(c => c.classList.remove('selected'));
    cat.classList.add('selected');
  });
});

// Signup function
function signup() {
  const uname = document.getElementById("signupUsername").value.trim();
  const pwd = document.getElementById("signupPassword").value;
  if (!uname || !pwd) return alert("All fields required.");
  if (users[uname]) return alert("Username already exists.");
  users[uname] = { password: pwd, history: [] };
  localStorage.setItem("users", JSON.stringify(users));
  alert("Signup successful! Please login.");
  togglePage("login");
}

// Login function
function login() {
  const uname = document.getElementById("loginUsername").value.trim();
  const pwd = document.getElementById("loginPassword").value;
  if (!uname || !pwd) return alert("All fields required.");
  if (!users[uname]) return alert("User not found.");
  if (users[uname].password !== pwd) return alert("Incorrect password.");
  currentUser = uname;
  togglePage("category");
}

// Starting the quiz
function startQuiz() {
  togglePage("quiz");
  current = 0;
  score = 0;
  quizData = allQuizzes[selectedCategory];

  const music = document.getElementById("bgMusic");
  music.pause();
  music.currentTime = 0;

  function userInteracted() {
    music.play().catch(() => {});
    document.getElementById("musicButton").textContent = "Pause Music";
    window.removeEventListener("click", userInteracted);
  }
  window.addEventListener("click", userInteracted, { once: true });

  showQuestion();
  startGlobalTimer();
  resetTimerPerQuestion();
}

// Show current question
function showQuestion() {
  document.getElementById("result").textContent = "";
  document.getElementById("mcqOptions").innerHTML = "";
  document.getElementById("trueFalseOptions").innerHTML = "";
  document.getElementById("fillBlank").innerHTML = "";
  document.getElementById("matchPairs").innerHTML = "";

  if (current >= quizData.length) {
    endQuiz();
    return;
  }
  const q = quizData[current];
  document.getElementById("question").textContent = q.question;

  if (q.type === "mcq") {
    q.options.forEach(opt => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="radio" name="answer" value="${opt}" /> ${opt}`;
      label.classList.add("option");
      document.getElementById("mcqOptions").appendChild(label);
    });
  } else if (q.type === "truefalse") {
    ["True", "False"].forEach(val => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="radio" name="answer" value="${val}" /> ${val}`;
      label.classList.add("option");
      document.getElementById("trueFalseOptions").appendChild(label);
    });
  } else if (q.type === "fillblank") {
    document.getElementById("fillBlank").innerHTML =
      `<input type="text" id="fillInput" placeholder="Type your answer here" />`;
  } else if (q.type === "match") {
    const container = document.getElementById("matchPairs");
    container.innerHTML = "";
    q.pairsLeft.forEach((leftItem, idx) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <label>${leftItem}: 
          <select id="match_${idx}">
            <option value="">Select</option>
            ${q.pairsRight.map(r => `<option value="${r}">${r}</option>`).join("")}
          </select>
        </label>`;
      container.appendChild(div);
    });
  }
  resetTimerPerQuestion();
}

// Check answer for current question
function checkAnswer() {
  const q = quizData[current];
  let userAnswer;

  if (q.type === "mcq" || q.type === "truefalse") {
    const radios = document.querySelectorAll('input[name="answer"]');
    userAnswer = null;
    for (const r of radios) {
      if (r.checked) {
        userAnswer = r.value;
        break;
      }
    }
    if (userAnswer === null) return alert("Please select an answer.");
    if (userAnswer.toLowerCase() === q.answer.toLowerCase()) {
      score++;
      document.getElementById("result").textContent = "Correct!";
    } else {
      document.getElementById("result").textContent = `Wrong! Correct answer: ${q.answer}`;
    }
  } else if (q.type === "fillblank") {
    userAnswer = document.getElementById("fillInput").value.trim();
    if (!userAnswer) return alert("Please enter your answer.");
    if (userAnswer.toLowerCase() === q.answer.toLowerCase()) {
      score++;
      document.getElementById("result").textContent = "Correct!";
    } else {
      document.getElementById("result").textContent = `Wrong! Correct answer: ${q.answer}`;
    }
  } else if (q.type === "match") {
    let allCorrect = true;
    for (let i = 0; i < q.pairsLeft.length; i++) {
      const sel = document.getElementById(`match_${i}`);
      if (!sel.value || sel.value !== q.pairsRight[i]) {
        allCorrect = false;
        break;
      }
    }
    if (allCorrect) {
      score++;
      document.getElementById("result").textContent = "Correct!";
    } else {
      document.getElementById("result").textContent = "Wrong! Correct pairs are shown.";
    }
  }
  current++;
  setTimeout(() => {
    showQuestion();
  }, 1500);
}

// Skip question
function skipQuestion() {
  current++;
  showQuestion();
}

// End the quiz and show summary
function endQuiz() {
  clearInterval(globalTimerInterval);
  currentUser = currentUser || "guest";
  togglePage("summary");
  document.getElementById("summary").innerHTML = `<p>User: <strong>${currentUser}</strong></p><p>Your score: <strong>${score} / ${quizData.length}</strong></p>`;

  // Store history
  if (currentUser !== "guest") {
    users[currentUser].history.push({
      category: selectedCategory,
      score,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("users", JSON.stringify(users));
  }
  showHistory(currentUser);
}

// Show user's history
function showHistory(username) {
  const historyContainer = document.getElementById("allTimeHistory");
  historyContainer.innerHTML = "<h3>All-Time History</h3>";
  if (!users[username] || users[username].history.length === 0) {
    historyContainer.innerHTML += "<p>No history available.</p>";
    return;
  }
  users[username].history.forEach(entry => {
    const div = document.createElement("div");
    div.classList.add("history-entry");
    div.textContent = `Category: ${entry.category} | Score: ${entry.score} | Date: ${entry.date}`;
    historyContainer.appendChild(div);
  });
}

// Music control
function toggleMusic() {
  const music = document.getElementById("bgMusic");
  const btn = document.getElementById("musicButton");
  if (music.paused) {
    music.play();
    btn.textContent = "Pause Music";
  } else {
    music.pause();
    btn.textContent = "Play Music";
  }
}

// Timer per question
let questionTimer;
const QUESTION_TIME_LIMIT = 30;

function resetTimerPerQuestion() {
  clearInterval(questionTimer);
  let timeLeft = QUESTION_TIME_LIMIT;
  document.getElementById("timeLeft").textContent = timeLeft + "s";

  questionTimer = setInterval(() => {
    timeLeft--;
    document.getElementById("timeLeft").textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(questionTimer);
      alert("Time's up for this question!");
      skipQuestion();
    }
  }, 1000);
}

// Global timer (e.g., 60 min)
function startGlobalTimer() {
  clearInterval(globalTimerInterval);
  globalTimeSeconds = 60 * 60;
  updateGlobalTimerDisplay();

  globalTimerInterval = setInterval(() => {
    globalTimeSeconds--;
    updateGlobalTimerDisplay();
    if (globalTimeSeconds <= 0) {
      clearInterval(globalTimerInterval);
      alert("Global time over. Quiz ending.");
      endQuiz();
    }
  }, 1000);
}

function updateGlobalTimerDisplay() {
  const minutes = Math.floor(globalTimeSeconds / 60);
  const seconds = globalTimeSeconds % 60;
  document.getElementById("globalTime").textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Cheat detection on tab visibility change
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    alert("Warning: Switching tabs is considered cheating. You will be logged out.");
    logoutAndReset();
  }
});

function logoutAndReset() {
  clearInterval(globalTimerInterval);
  currentUser = "";
  togglePage("login");
  alert("Logged out due to cheating.");
}

// Logout button handler (if you add one)
function logout() {
  currentUser = "";
  clearInterval(globalTimerInterval);
  togglePage("login");
}

// Quiz data example
const allQuizzes = {
  sports: [
    {
      question: "Who won the FIFA World Cup 2018?",
      type: "mcq",
      options: ["France", "Croatia", "Brazil", "Germany"],
      answer: "France"
    },
    // more sports questions...
  ],
  reasoning: [
    // reasoning questions
  ],
  coding: [
    // coding questions
  ],
  technology: [
    // technology questions
  ],
  history: [
    {
      question: "Match the year with the event",
      type: "match",
      pairsLeft: ["1776", "1947", "1969"],
      pairsRight: ["American Independence", "India Independence", "Moon Landing"],
      answer: ["American Independence", "India Independence", "Moon Landing"]
    }
  ]
};
