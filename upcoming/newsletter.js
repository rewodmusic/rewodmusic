(() => {
  // TODO: ha a worker URL-ed más, itt írd át
  const API_URL = "https://rewod-newsletter.rewodmusic.workers.dev";

  const form = document.getElementById("newsletterForm");
  const input = document.getElementById("newsletterEmail");
  const btn = document.getElementById("newsletterBtn");
  const statusEl = document.getElementById("newsletterStatus");

  if (!form || !input || !btn || !statusEl) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const setStatus = (msg) => {
    statusEl.textContent = msg || "";
  };

  const setLoading = (loading) => {
    // vizuál + duplaküldés elleni védelem
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);

    // opcionális: accessibility + natív UI
    btn.setAttribute("aria-busy", loading ? "true" : "false");
    btn.setAttribute("aria-disabled", loading ? "true" : "false");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    // ha már loading, ne csináljon semmit (dupla tap / Enter)
    if (btn.disabled) return;

    const email = (input.value || "").trim().toLowerCase();

    if (!email) {
      setStatus("Please enter your email.");
      input.focus();
      return;
    }
    if (!emailRegex.test(email)) {
      setStatus("Please enter a valid email.");
      input.focus();
      return;
    }

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
      } catch {
        // ha nincs JSON, marad üres
      }

      if (!res.ok) {
        setStatus(data?.error || "Something went wrong. Please try again.");
        return;
      }

      // igazítsd a worker visszatéréséhez
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