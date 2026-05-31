async function getRandomWikiPage() {
  try {
    const res = await fetch(
      "https://en.wikipedia.org/api/rest_v1/page/random/summary",
    );
    const data = await res.json();
    
    console.log(data);

    text = `
            <h2>${data.title}</h2>
            <p>${data.extract_html}</p>
            <a href="${data.content_urls.desktop.page}" target="_blank">
                Read on Wikipedia
            </a>
        `;
  } catch (err) {
    text = "<p>Failed to load a random page.</p>";
    text = "";
    console.error(err);
  } finally {
    return text;
  }
}

let filesAdded = [];

//Later used to maintain all sessions in frontend
const state = {
  sessions: [],
  activeId: null,
  busy: false,
};

//Structure of each session:
/*
  {
    "id": "e07ae2e1-fa16-4bdb-9551-4fc75baaf4ea",
    "name": "Session 1",
    "collection": "default-collection",
    "model": "deepseek-r1:1.5b",
          "messages": [
        {
          "role": "user",
          "content": "Monkey in AI???"
        },
        {
          "role": "assistant",
          "content": "The question regarding \"Monkey in AI???\" is unclear and does not appear to be supported by the provided context. The game mechanics discussed involve train routes, Destination Tickets, and plastic trains but do not mention monkeys or artificial intelligence. Therefore, there is no relevant information available for answering this question based on the given text.\n\nAnswer: The context does not provide any information related to \"Monkey in AI,\" as it involves a game with train routes and destination tickets rather than AI mechanics or monkey-related elements.",
          "sources": [
            "data\\ticket_to_ride.pdf:3:3",
            "data\\ticket_to_ride.pdf:3:2",
            "data\\monopoly.pdf:1:2",
            "data\\ticket_to_ride.pdf:2:5",
            "data\\ticket_to_ride.pdf:1:0"
          ]
        },
        {
          "role": "user",
          "content": "Monopoly how to play? I am 7"
        },
        {
          "role": "assistant",
          "content": "**Monopoly Play Summary (for a child)**\n\n1. **Starting Point**: Each player begins with $1000 and the game starts at City Hall.\n\n2. **Dice Movement**:\n   - You have two white dice (number 1-6) and one red die (number 1-6).\n   - On your turn, you can move either one die's face value, both dice combined, or their sum to land on another property.\n   - Example: Rolling a 4 and a 3 allows moving 4, 3, or 7 spaces from where you are.\n\n3. **Buying Properties**:\n   - When you land on a property (like City Hall), it can either be your home for rent or buy it with your money.\n   - If there's money in the bank, move to the next property in sequence and buy it if possible; otherwise, put it up for sale.\n\n4. **Chance Cards**:\n   - These cards offer rewards when you land on them (money) or after playing games.\n   - Example: A Chance card might give you $100 if you land here.\n\n5. **Community Chest and Title Deed**:\n   - Community Chest draws a card each game, letting players draw from their deck at the bottom of the board.\n   - Title Deed allows you to sell something (like your neighbor's house) for tax benefit.\n\n6. **The 12-Step Path**:\n   - The path with 12 spaces gives you extra moves when playing Chance cards.\n\n7. **End of Game**:\n   - When all players have moved, the player with the most money wins.\n   - You can buy more properties or sell what you own to increase your wealth.\n\nRemember, it's easy to roll an \"add\" space (sum) first, which allows moving further. Use this wisely to stay ahead of other players!",
          "sources": [
            "data\\monopoly.pdf:0:0",
            "data\\monopoly.pdf:1:0",
            "data\\ticket_to_ride.pdf:1:1",
            "data\\monopoly.pdf:0:1",
            "data\\monopoly.pdf:1:2"
          ]
        }
      ],
    "created_at": "2026-05-30T21:09:54.326654"
  }
*/

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (res.status === 204) return null;
  return res.json();
}

async function queryAPI(session_id, query, info_content) { //Needed a diff one cuz files in formdata
  const formData = new FormData();

  filesAdded.forEach(file => {
    formData.append("files", file);
  });
  filesAdded = [];
  document.getElementById("fileList").innerHTML = "";

  formData.append("session_id", session_id);
  formData.append("query", query);
  formData.append("info_content", info_content || "");

  const res = await fetch("api/query", {
    method: "POST",
    body: formData
  });
  return res.json();
}

function getActiveSession() {
  return state.sessions.find((s) => s.id === state.activeId) || null;
}

function setActive(id) {
  state.activeId = id;
  renderSidebar();
  renderMain();
}

//Renders for each session in state.sessions
function renderSidebar() {
  const list = document.getElementById("sessionList");
  list.innerHTML = "";

  for (const s of state.sessions) {
    const item = document.createElement("div");
    item.className =
      "session-item" + (s.id === state.activeId ? " active" : "");
    item.dataset.id = s.id; //Makes a property as data-id

    const nameEl = document.createElement("span");
    nameEl.className = "session-name";
    nameEl.textContent = s.name;
    nameEl.title = s.name;

    const delBtn = document.createElement("button");
    delBtn.className = "session-del";
    delBtn.textContent = "X";
    delBtn.title = "Delete session";

    const renameBtn = document.createElement("button");
    renameBtn.className = "session-rename";
    renameBtn.textContent = "✎";
    renameBtn.title = "Rename session";

    nameEl.addEventListener("click", () => setActive(s.id));
    nameEl.addEventListener("dblclick", () => renameSession(s.id));
    renameBtn.addEventListener("click", () => renameSession(s.id));
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSession(s.id);
    });

    item.appendChild(nameEl);
    item.appendChild(renameBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  }
}
//Messages Window
function renderMain() {
  const session = getActiveSession();
  const titleEl = document.getElementById("sessionTitle");
  const dbEl = document.getElementById("collectionInput");
  const modelEl = document.getElementById("modelInput");
  const feed = document.getElementById("feed");

  if (!session) {
    titleEl.textContent = "—";
    dbEl.value = "";
    modelEl.value = "";
    feed.innerHTML =
      '<div class="empty-state"><p>Select a session or create one.</p></div>';

    getRandomWikiPage().then((result) => {
      if (result)
        feed.innerHTML = `<div class="empty-state" style="flex-direction: column;"><p>Select a session or create one. Or, you can read this interesting article (every wikipage is interesting): <br><br><br>${text}</p></div>`;
    });
    return;
  }

  titleEl.textContent = session.name;
  dbEl.value = session.collection || "";
  modelEl.value = session.model || "deepseek-r1:1.5b";

  feed.innerHTML = "";

  const msgs = session.messages || [];

  if (!msgs.length) {
    feed.innerHTML = `<div class="empty-state"><p>No questions yet. Ask something about your documents.</p></div>`;
    getRandomWikiPage().then((result) => {
      if (result)
        feed.innerHTML = `<div class="empty-state" style="flex-direction: column;"><p>No questions yet. Ask something about your documents. Or, you can read this interesting article (every wikipage is interesting): <br><br><br>${text}</p></div>`;
    });
    return;
  }

  for (let i = 0; i < msgs.length; i++) {
    //1st msg should be user duh
    // (In case someone messes with session file)
    if (msgs[i].role == "info") {
      feed.appendChild(buildInfoEntry(msgs[i].content));
      continue;
    }
    if (msgs[i].role !== "user") continue;

    const q = msgs[i];
    const a = msgs[i + 1]?.role === "assistant" ? msgs[i + 1] : null; //If assisstant hasn't replied yet
    if (a) i++;

    feed.appendChild(buildEntry(q.content, a));
  }

  feed.scrollTop = feed.scrollHeight;
}

//Actual Messgaes building

function buildInfoEntry(info) {
  const entry = document.createElement("div");
  entry.className = "qa-entry";
  const infoRow = document.createElement("div");
  infoRow.className = "i-row";

  infoRow.innerHTML = `<span class="badge badge-i">!</span><span class="i-text"><i><b>${esc(info)}</b></i></span>`;
  
  entry.append(infoRow);
  return entry
}

function buildEntry(question, answerMsg) {
  const entry = document.createElement("div");
  entry.className = "qa-entry";

  const qRow = document.createElement("div");
  qRow.className = "q-row";
  //Escaping to make it XSS proof (event though it is just local (Also, why is it called 'CROSS' site scripting? Which other site is it 'CROSS'ing over with? (https://www.reddit.com/r/hacking/comments/vgmd38/what_is_the_meaning_of_cross_site_in_xss_csrf/)))
  qRow.innerHTML = `<span class="badge badge-q">Q</span><span class="q-text">${esc(question)}</span>`;
  entry.appendChild(qRow);

  const aRow = document.createElement("div");
  aRow.className = "a-row";

  const badge = document.createElement("span");
  badge.className = "badge badge-a";
  badge.textContent = "A";
  aRow.appendChild(badge);

  const body = document.createElement("div");
  body.className = "a-body";

  //If the current query
  if (!answerMsg) {
    body.innerHTML = `
      <div class="a-loading">
          Searching
          <span class="dot-anim">
              <span>.</span><span>.</span><span>.</span>
          </span>
      </div>
  `;
    getRandomWikiPage().then((result) => {
      if (result) body.innerHTML = "Searching... Meanwhile read this:" + result;
    });
  } else {
    //Already answered
    const textEl = document.createElement("div");
    textEl.className = "a-text";
    textEl.textContent = answerMsg.content;
    body.appendChild(textEl);

    const validSources = (answerMsg.sources || []).filter(Boolean);
    if (validSources.length) {
      const srcs = document.createElement("div");
      srcs.className = "sources";
      srcs.innerHTML = validSources
        .map((s) => `<span class="source-chip">${esc(s)}</span>`)
        .join("");
      body.appendChild(srcs);
    }
  }

  aRow.appendChild(body);
  entry.appendChild(aRow);
  return entry;
}

async function loadSessions() {
  state.sessions = await api("/sessions");
  renderSidebar();
  if (state.sessions.length) setActive(state.sessions[0].id);
  else renderMain();
}

async function newSession() {
  const s = await api("/sessions", {
    method: "POST",
    body: JSON.stringify({ name: `Session ${state.sessions.length + 1}` }),
  });
  state.sessions.push(s);
  renderSidebar();
  setActive(s.id);
}

async function deleteSession(id) {
  if (!confirm("Delete this session?")) return;
  await api(`/sessions/${id}`, { method: "DELETE" });
  state.sessions = state.sessions.filter((s) => s.id !== id);
  if (state.activeId === id) {
    state.activeId = state.sessions.length ? state.sessions[0].id : null;
  }
  renderSidebar();
  renderMain();
}

async function renameSession(id) {
  const s = state.sessions.find((x) => x.id === id);
  const newName = prompt("Rename session:", s?.name || "");
  if (!newName || newName === s?.name) return;
  const updated = await api(`/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: newName }),
  });
  Object.assign(s, updated);
  renderSidebar();
  if (state.activeId === id)
    document.getElementById("sessionTitle").textContent = updated.name;
}

async function saveConfig() {
  const session = getActiveSession();
  if (!session) return;
  const collection = document.getElementById("collectionInput").value.trim();
  const model = document.getElementById("modelInput").value.trim();
  const updated = await api(`/sessions/${session.id}`, {
    method: "PATCH",
    body: JSON.stringify({ collection, model }),
  });
  Object.assign(session, updated);
}

async function clearSession() {
  const session = getActiveSession();
  if (!session || !session.messages.length) return;
  if (!confirm("Clear chat history for this session?")) return;
  const updated = await api(`/sessions/${session.id}/clear`, {
    method: "POST",
  });
  Object.assign(session, updated);
  renderMain();
}

// function sendFilesOnly() {
//   state.busy = true;
//   document.getElementById("sendBtn").disabled = true;

// }

async function sendQuery() {
  if (state.busy) return;
  const session = getActiveSession();
  if (!session) return;

  const textarea = document.getElementById("queryInput");
  const query = textarea.value.trim();

  if (!query && filesAdded.length == 0) return;

  textarea.value = "";
  resizeTextarea(textarea);

  state.busy = true;
  document.getElementById("sendBtn").disabled = true;
  const info_content = filesAdded.length > 0? "User added the following file(s):\n\t" + (filesAdded.map(file => `${file.name} (${(file.size / 1024).toFixed(1)} KB)`).join("\n\t") ): null
  if (filesAdded.length > 0) session.messages.push({ role: "info", content: info_content })

  if (query) {  //Can just add files, not necessarily query everytime
    //Loading shows up BEFORE sending query to backend
    session.messages.push({ role: "user", content: query });
  }
  renderMain();

  //Removes empty-states (like 'start ur chat')
  const feed = document.getElementById("feed");
  const es = feed.querySelector(".empty-state");
  if (es) es.remove();

  try {
    // const result = await api("/query", {
    //   method: "POST",
    //   body: JSON.stringify({ session_id: session.id, query }),
    // });

    const result = await queryAPI(
      // body: JSON.stringify({ session_id: session.id, query }),
      session.id, query, info_content
    );

    if (result.error) {
      session.messages.push({
        role: "assistant",
        content: `Error: ${result.error}`,
        sources: [],
      });
    } else {
      session.messages.push({
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      });
    }
  } catch (err) {
    session.messages.push({
      role: "assistant",
      content: `Network error: ${err.message}`,
      sources: [],
    });
  } finally {
    state.busy = false;
    document.getElementById("sendBtn").disabled = false;
    renderMain();
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

function addFiles() {
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  fileInput.click();
  fileInput.addEventListener("change", () => {
    filesAdded = [];
    const files = event.target.files;
    fileList.innerHTML = "";

    if (files.length === 0) {
      fileList.textContent = "No files selected.";
      return;
    }

    const list = document.createElement("ul");
    for (const file of files) {
      const listItem = document.createElement("li");
      const file_name =
        file.name.length < 5 ? file.name : file.name.slice(0, 3) + "...";
      listItem.textContent = `${file_name} (${(file.size / 1024).toFixed(1)} KB)`;
      listItem.title = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      list.appendChild(listItem);
      filesAdded.push(file);
    }
    fileList.appendChild(list);
    
    console.log("Logging files"); //This is being called multiple times smh
    console.log(filesAdded);
  });
}

//EventListeners
document.getElementById("newSessionBtn").addEventListener("click", newSession);
document.getElementById("saveConfigBtn").addEventListener("click", saveConfig);
document.getElementById("clearBtn").addEventListener("click", clearSession);
document.getElementById("sendBtn").addEventListener("click", sendQuery);
document.getElementById("fileBtn").addEventListener("click", addFiles);

document.getElementById("queryInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendQuery();
  }
});

document.getElementById("queryInput").addEventListener("input", function () {
  resizeTextarea(this);
});

//💂💂🏻👑🚇💂🏼‍♀️🍵☕🫖 (init)
loadSessions();
