import sys
import os
import uuid
from datetime import datetime

import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from flask import Flask, request, jsonify, render_template
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.llms.ollama import Ollama
from utils import get_embedding_function, load_sessions, save_sessions, resolve_path, strip_think, add_files_to_db

app = Flask(__name__)

PROMPT_TEMPLATE = """

    CHAT HISTORY:
    {history}

    Answer the question based only on the following context:

    {context}

    ---

    Answer the question based on the above context: {question}
"""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    return jsonify(load_sessions())

@app.route("/api/sessions", methods=["POST"])
def create_session():
    sessions = load_sessions()
    body = request.get_json(silent=True) or {}
    session = {
        "id": str(uuid.uuid4()),
        "name": body.get("name", f"Session {len(sessions) + 1}"),
        "memory": body.get("memory", "0"),
        "collection": body.get("collection", "default-collection"),
        "model": body.get("model", "deepseek-r1:1.5b"),
        "messages": [],
        "created_at": datetime.now().isoformat(),
    }
    sessions.append(session)
    save_sessions(sessions)
    return jsonify(session), 201

@app.route("/api/sessions/<session_id>", methods=["PATCH"])
def update_session(session_id):
    sessions = load_sessions()
    body = request.get_json(silent=True) or {}
    for s in sessions:
        if s["id"] == session_id:
            for field in ("memory", "name", "collection", "model"):
                if field in body:
                    s[field] = body[field]
            save_sessions(sessions)
            return jsonify(s)
    return jsonify({"error": "not found"}), 404

@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    sessions = [s for s in load_sessions() if s["id"] != session_id]
    save_sessions(sessions)
    return "", 204

@app.route("/api/sessions/<session_id>/clear", methods=["POST"])
def clear_session(session_id):
    sessions = load_sessions()
    for s in sessions:
        if s["id"] == session_id:
            s["messages"] = []
            save_sessions(sessions)
            return jsonify(s)
    return jsonify({"error": "not found"}), 404


@app.route("/api/query", methods=["POST"])
def query():
    session_id = request.form.get("session_id")
    query_text = request.form.get("query")
    info_content = request.form.get("info_content")
    files = request.files.getlist("files")

    sessions = load_sessions()
    #short circuits as soon as it finds a match
    session = next((s for s in sessions if s["id"] == session_id), None)

    if not session:
        return jsonify({"error": "session not found"}), 404
    if info_content:
        session["messages"].append({"role": "info", "content": info_content})
        save_sessions(sessions)
    
    collection = (session["collection"])

    db = Chroma(
        persist_directory="chroma",
        embedding_function=get_embedding_function(),
        collection_name = collection,
        create_collection_if_not_exists=True
    )

    if files:
        try:
            add_files_to_db(files, db)
        except Exception as exc:
            print(str(exc))
            return jsonify({"error": str(exc)}), 500

    if not query_text:
        return jsonify({"error": "empty query"}), 400
    
    num_docs = db._collection.count()
    print(f"Documents in collection: {num_docs}")
    if (not num_docs):
        return jsonify({"error": "No documents added yet"}), 400

    try:
        model_name = session.get("model") or "deepseek-r1:1.5b"

        results = db.similarity_search_with_score(query_text, k=5)

        context_text = "\n\n---\n\n".join(
            doc.page_content for doc, _ in results
        )

        memory = int(session.get("memory") or 0)
        memory_text = None
        if memory:
            all_past_messages = session.get("messages")
            all_roled_messages = [msg for msg in all_past_messages if msg["role"] in ("user", "assistant")]
            all_valid_messages = []
            i = len(all_roled_messages) - 1
            while (i>=0 and len(all_valid_messages) < memory * 2):
                msg = all_roled_messages[i]
                prev_msg = all_roled_messages[i - 1]
                if msg["role"] != "assistant" or prev_msg["role"] != "user":
                    i-=1
                else:
                    #Will reverse the list at last
                    all_valid_messages.append(msg)
                    all_valid_messages.append(prev_msg)
                    i-=2
            all_valid_messages.reverse()

            memory_text = "\n".join(
                f"{msg['role']}: {msg['content']}"
                for msg in all_valid_messages
            )

        print("============================+=====================")
        print("memory_text")
        print(memory_text)
        print(memory)
        print(session)
        print("memory_text")
        print("============================+=====================")

        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE).format(
            context=context_text, question=query_text, history = memory_text
        )

        raw_response = Ollama(model=model_name).invoke(prompt)
        response_text = strip_think(raw_response)
        sources = [doc.metadata.get("id") for doc, _ in results]

        session["messages"].append({"role": "user", "content": query_text})
        session["messages"].append(
            {"role": "assistant", "content": response_text, "sources": sources}
        )
        save_sessions(sessions)

        return jsonify({"answer": response_text, "sources": sources})

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
