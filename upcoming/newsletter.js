(() => {
  const API_URL = "https://rewod-newsletter.rewodmusic.workers.dev";

  const form = document.getElementById("newsletterForm");
  const input = document.getElementById("newsletterEmail");
  const btn = document.getElementById("newsletterBtn");
  const statusEl = document.getElementById("newsletterStatus");

  if (!form || !input || !btn || !statusEl) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ensure button has a <span> wrapper for smooth opacity changes
  const ensureBtnSpan = () => {
    const hasSpan = btn.querySelector("span");
    if (hasSpan) return hasSpan;

    const label = btn.textContent || "SUBSCRIBE";
    btn.textContent = "";
    const span = document.createElement("span");
    span.textContent = label; // keep your original casing (SUBSCRIBE)
    btn.appendChild(span);
    return span;
  };

  const btnSpan = ensureBtnSpan();

  const setStatus = (msg) => {
    statusEl.textContent = msg || "";
  };

  const setLoading = (loading) => {
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
    btn.setAttribute("aria-busy", loading ? "true" : "false");

    // keep label stable (no "Subscribing..." text => no overflow)
    // if you ever want to change it, do it here:
    // btnSpan.textContent = loading ? "SUBSCRIBE" : "SUBSCRIBE";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    const email = (input.value || "").trim().toLowerCase();
    if (!email) return setStatus("Please enter your email.");
    if (!emailRegex.test(email)) return setStatus("Please enter a valid email.");

    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        setStatus(data?.error || "Something went wrong. Please try again.");
        return;
      }

      if (data?.status === "subscribed") {
        setStatus("Subscribed. You’ll get an email on the next original release.");
        input.value = "";
      } else if (data?.status === "already_subscribed" || data?.status === "exists") {
        setStatus("You're already subscribed.");
      } else {
        setStatus("Done.");
        input.value = "";
      }
    } catch (err) {
      setStatus("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  });
})();