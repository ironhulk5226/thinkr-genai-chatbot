import { v4 as uuidv4 } from 'https://cdn.skypack.dev/uuid';

const input = document.querySelector('#input');
const chatContainer = document.querySelector('#chat-container')
const askBtn = document.querySelector('#ask-btn')

// generate unique session id everytime when new page loads
const sessionId = uuidv4();

// Load API URL from server config
let API_URL = '';

const configReady = (async () => {
    try {
        const response = await fetch('/config');

        if (!response.ok) {
            throw new Error('Config endpoint unavailable');
        }

        const config = await response.json();
        API_URL = config.apiUrl || '';
    } catch (error) {
        // Keep relative fallback so requests still work when frontend and backend share origin.
        API_URL = '';
    }
})();


input?.addEventListener('keyup',handleEnter)
askBtn?.addEventListener('click',handleAsk)



const loading = document.createElement('div')
loading.className = 'message-loading'
loading.textContent = 'Thinking...'

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function applyInlineFormatting(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function formatAssistantMessage(rawText) {
    if (!rawText) {
        return '';
    }

    const escaped = escapeHtml(rawText.trim());
    const codeBlocks = [];

    const withCodePlaceholders = escaped.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        const token = `__CODE_BLOCK_${codeBlocks.length}__`;
        const languageClass = lang ? ` language-${lang}` : '';
        codeBlocks.push(`<pre class="assistant-code"><code class="${languageClass.trim()}">${code.trim()}</code></pre>`);
        return token;
    });

    const lines = withCodePlaceholders.split('\n');
    const chunks = [];
    let paragraph = [];
    let listItems = [];

    function flushParagraph() {
        if (!paragraph.length) {
            return;
        }

        const content = applyInlineFormatting(paragraph.join('<br>'));
        chunks.push(`<p>${content}</p>`);
        paragraph = [];
    }

    function flushList() {
        if (!listItems.length) {
            return;
        }

        const items = listItems
            .map((item) => `<li>${applyInlineFormatting(item)}</li>`)
            .join('');

        chunks.push(`<ul>${items}</ul>`);
        listItems = [];
    }

    for (const line of lines) {
        const trimmed = line.trim();
        const bullet = trimmed.match(/^[-*]\s+(.+)$/);

        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }

        if (bullet) {
            flushParagraph();
            listItems.push(bullet[1]);
            continue;
        }

        flushList();
        paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();

    let html = chunks.join('');

    codeBlocks.forEach((block, index) => {
        html = html.replace(`__CODE_BLOCK_${index}__`, block);
    });

    return html;
}


async function handleAsk(e){
    const text = input?.value.trim();
    if(!text){
        return;
    }

    await generate(text)
}


async function generate(query){
    // 1.append message to ui 
    // 2.send it to LLM 
    // 3.append response to the ui

    const message = document.createElement('div')
    message.className = 'message-user'
    message.textContent = query
    chatContainer.appendChild(message);

    input.value = ''; // reset input

    chatContainer.appendChild(loading)

    try {
        // Call server
        const assistantMsg = await callServer(query)
        const assistantMsgElem = document.createElement('div')
        assistantMsgElem.className = 'message-assistant'
        assistantMsgElem.innerHTML = formatAssistantMessage(assistantMsg)
        chatContainer.appendChild(assistantMsgElem);
    } catch (error) {
        const errorElem = document.createElement('div')
        errorElem.className = 'message-error'
        errorElem.textContent = error.message || 'Unable to generate a response right now.'
        chatContainer.appendChild(errorElem)
    } finally {
        if (chatContainer.contains(loading)) {
            chatContainer.removeChild(loading)
        }
    }

    chatContainer.scrollTop = chatContainer.scrollHeight
    // console.log(assistantMsg)

}

async function callServer(inputText){
    await configReady;

    const response = await fetch(`${API_URL}/chat`,{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        
        },
        body: JSON.stringify({message:inputText,sessionId})
    })

    if(!response.ok){
        throw new Error("Server error. Please check if backend is running on port 1000.")
    }

    const result = await response.json();
    return result.message;
}

async function handleEnter(e){
    if(e.key === 'Enter'){
        const text = input?.value.trim();
        if(!text){
            return;
        }
        await generate(text)
    
    }
}