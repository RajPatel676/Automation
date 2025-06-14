function showMessage() {
    alert("Hello from JavaScript!");
}

// Feature: add dynamic content
document.addEventListener("DOMContentLoaded", () => {
    const para = document.createElement("p");
    para.textContent = "This paragraph was added by JavaScript.";
    document.body.appendChild(para);
});
