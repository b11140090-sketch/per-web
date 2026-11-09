const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
let toastTimeout;

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "開啟導覽選單" : "關閉導覽選單");
  navLinks.classList.toggle("open", !isExpanded);
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "開啟導覽選單");
    navLinks.classList.remove("open");
  }
});

document.querySelectorAll(".email-copy").forEach((button) => {
  button.addEventListener("click", async () => {
    const email = button.dataset.copyEmail;
    try {
      await navigator.clipboard.writeText(email);
      showToast("Email 已複製到剪貼簿！");
    } catch (error) {
      const emailField = document.createElement("textarea");
      emailField.value = email;
      emailField.setAttribute("readonly", "");
      emailField.style.position = "fixed";
      emailField.style.opacity = "0";
      document.body.append(emailField);
      emailField.select();
      const copied = document.execCommand("copy");
      emailField.remove();
      if (!copied) {
        showToast("複製失敗，請手動選取 Email 地址。");
        return;
      }
      showToast("Email 已複製到剪貼簿！");
    }
  });
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = formData.get("name").trim();
  const senderEmail = formData.get("email").trim();
  const message = formData.get("message").trim();
  const subject = encodeURIComponent(`來自 ${name} 的聯絡訊息`);
  const body = encodeURIComponent(`${message}\n\n寄件者：${name}\n回覆 Email：${senderEmail}`);
  showToast("已為你準備郵件草稿！");
  window.location.href = `mailto:nhh270499@gmail.com?subject=${subject}&body=${body}`;
});

const sections = document.querySelectorAll("main section[id]");
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll(".nav-link").forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
      link.classList.toggle("active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-30% 0px -60% 0px" });

sections.forEach((section) => sectionObserver.observe(section));
