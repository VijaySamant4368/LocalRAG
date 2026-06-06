# LocalRAG

A lightweight, local Retrieval-Augmented Generation (RAG) web application that allows you to chat with your documents using local LLMs. Built with Flask, LangChain, ChromaDB, and Ollama.

## 🚀 Features

- **Local & Private**: Your documents and queries never leave your machine.
- **Multi-Session Support**: Organise different topics into separate chat sessions.
- **Document Management**: Upload and index various file formats including:
  - PDF (`.pdf`)
  - Text (`.txt`)
  - CSV (`.csv`)
  - Markdown (`.md`)
- **Flexible Configuration**: 
  - **Memory**: Adjust how many past interactions are included in the context.
  - **Collections**: Group documents into different vector database collections.
  - **Model Selection**: Switch between different local models available on Ollama.
- **Smart Context**: Automatically retrieves relevant chunks from your documents to answer questions.
- **Interactive UI**: Clean, responsive interface with Markdown support and source citations.
- **Fun Empty State**: Displays random interesting Wikipedia articles while you wait or before you start.

## 🛠️ Prerequisites

1. **Python 3.8+**
2. **Ollama**: Download and install from [ollama.com](https://ollama.com/).
3. **Required Models**:
   - For answering: `ollama pull deepseek-r1:1.5b` (or your preferred model)
   - For embeddings: `ollama pull nomic-embed-text`

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd RAG-web
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## 🚦 Getting Started

1. **Start Ollama**: Ensure the Ollama service is running on your machine.
2. **Run the application**:
   ```bash
   python app.py
   ```
   Or use the provided batch file (Windows):
   ```bash
   run.bat
   ```
3. **Open in Browser**: Navigate to `http://127.0.0.1:5000`.

## 📖 How to Use

1. **Create a Session**: Click the `+` button in the sidebar to start a new chat.
2. **Upload Documents**: Click the paperclip icon, select your files, and they will be indexed into the current collection.
3. **Configure**:
   - **Context Memory**: Set how many previous message pairs to remember.
   - **Collection**: Name your vector store (e.g., "LegalDocs", "Manuals").
   - **Model**: Specify the Ollama model name you want to use.
4. **Ask Questions**: Type your query in the input bar. The assistant will search your documents and provide an answer with citations.

## 📂 Project Structure

```text
RAG-web/
├── app.py              # Main Flask application & API routes
├── utils.py            # RAG logic, document loaders, & embedding helpers
├── requirements.txt    # Python dependencies
├── sessions.json       # Persisted chat sessions (generated)
├── chroma/             # Local vector database storage (generated)
├── static/
│   ├── app.js          # Frontend logic (Vanilla JS)
│   └── style.css       # Styling
└── templates/
    └── index.html      # Main UI template
```

## 🤝 Contributing

Feel free to fork, open issues, and submit PRs

## 📜 License

MIT License.
