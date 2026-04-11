document.addEventListener("DOMContentLoaded", () => {
    const content = document.querySelector(".content");
    const form = document.getElementById("chat-form");
    const input = document.querySelector('.text');
    const icon = document.querySelector('.fa-solid');
    const main = document.querySelector('.main');
    const fold = document.querySelector('.fold');

    fold.addEventListener("click", () => {
        main.style.display = "none";
        icon.classList.remove('launcher-hidden');
    });

    icon.addEventListener("click", () => {
        icon.classList.add('launcher-hidden');
        main.style.display = "block";
        void main.offsetWidth;
        main.classList.add('is-opening');
        setTimeout(() => input.focus(), 300);
    });

const scrollToBottom = () => {
    requestAnimationFrame(() => {
        content.scrollTop = content.scrollHeight;
    });
};

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    // USER MESSAGE
    const userMsg = document.createElement("div");
    userMsg.className = "user";
    const rawHTML = marked.parse(text);

    // Sanitize for security
    const cleanHTML = DOMPurify.sanitize(rawHTML);
    userMsg.innerHTML = cleanHTML;
    content.appendChild(userMsg);

    input.value = "";
    scrollToBottom();

    // BOT PLACEHOLDER
    const botMsg = document.createElement("div");
    botMsg.className = "gpt";
    botMsg.textContent = "Typing...";
    content.appendChild(botMsg);
    scrollToBottom();

    try {
        // CALL YOUR BACKEND
        const res = await fetch("https://chatbot-production-878d.up.railway.app/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        const data = await res.json();

        // REPLACE "Typing..." WITH REAL RESPONSE
        const rawHTML = marked.parse(data.reply);
        const cleanHTML = DOMPurify.sanitize(rawHTML);
        botMsg.innerHTML = cleanHTML;

    } catch (err) {
        console.error(err);
        botMsg.textContent = "Server connection error";
    }

    scrollToBottom();
    });
});