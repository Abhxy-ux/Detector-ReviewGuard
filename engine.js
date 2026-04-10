/* ═══════════════════════════════════════════════
   ReviewGuard — Detection Engine (rule-based AI)
   ═══════════════════════════════════════════════ */

const RG = (() => {

  /* ── SIGNAL DEFINITIONS ── */
  const SIGNALS = {
    excessiveCaps: {
      test: t => {
        const words = t.split(/\s+/);
        const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
        return capsWords.length / words.length > 0.15;
      },
      weight: 12, color: 'red',
      title: 'Excessive use of capital letters',
      desc: 'Fake reviewers often SHOUT to seem emphatic. Genuine reviewers rarely use all-caps words.'
    },
    exclamations: {
      test: t => (t.match(/!{2,}/g) || []).length >= 2 || (t.match(/!/g) || []).length > 4,
      weight: 8, color: 'red',
      title: 'Overuse of exclamation marks',
      desc: 'Multiple exclamation marks signal artificial enthusiasm often seen in paid or incentivized reviews.'
    },
    superlativeOverload: {
      test: t => {
        const words = ['best', 'greatest', 'perfect', 'excellent', 'amazing', 'fantastic', 'superb', 'outstanding', 'wonderful', 'incredible', 'awesome', 'extraordinary', 'brilliant'];
        const count = words.filter(w => t.toLowerCase().includes(w)).length;
        return count >= 4;
      },
      weight: 14, color: 'red',
      title: 'Superlative overload',
      desc: 'Using 4+ extreme positive words is a strong fake review pattern. Real users rarely describe everything as "best", "perfect", and "amazing" simultaneously.'
    },
    vague: {
      test: t => {
        const vaguePatterns = [/very (good|nice|great|happy|satisfied|pleased)/gi, /good product/gi, /nice product/gi, /recommend (everyone|to all|to buy)/gi];
        return vaguePatterns.filter(p => p.test(t)).length >= 2;
      },
      weight: 13, color: 'red',
      title: 'Vague, generic language',
      desc: 'Phrases like "very good", "nice product", "recommend everyone" are hallmarks of template-based fake reviews.'
    },
    noSpecifics: {
      test: t => {
        const specificPatterns = [/₹\d+/, /\$\d+/, /\d+ (days?|weeks?|months?|hours?|year)/, /model|version|size|colour|color|variant/, /compared to/, /unlike/, /however|but|although|though/];
        return t.length < 250 && specificPatterns.filter(p => p.test(t)).length === 0;
      },
      weight: 15, color: 'amber',
      title: 'Lacks specific details',
      desc: 'Authentic reviews typically mention price paid, usage duration, product variants, or comparisons. This review has none.'
    },
    repetition: {
      test: t => {
        const words = t.toLowerCase().split(/\W+/).filter(w => w.length > 4);
        const freq = {};
        words.forEach(w => freq[w] = (freq[w] || 0) + 1);
        return Object.values(freq).filter(v => v >= 3).length >= 2;
      },
      weight: 10, color: 'red',
      title: 'Repetitive word usage',
      desc: 'The same key words appear multiple times, suggesting a bot-generated or copy-pasted review.'
    },
    shortLength: {
      test: t => t.trim().length < 80,
      weight: 8, color: 'amber',
      title: 'Review is very short',
      desc: 'Very short reviews (under 80 characters) provide little actionable information and may be incentivized star-only submissions.'
    },
    noNegatives: {
      test: (t, rating) => {
        const negWords = ['but', 'however', 'although', 'though', 'except', 'issue', 'problem', 'concern', 'downside', 'negative', 'bad', 'poor', 'disappointing', 'not good', 'could be better', 'wish', 'cons'];
        const hasNeg = negWords.some(w => t.toLowerCase().includes(w));
        return rating >= 4 && !hasNeg && t.length > 100;
      },
      weight: 10, color: 'amber',
      title: 'No negatives despite high rating',
      desc: 'Real 4–5 star reviews almost always mention at least one minor drawback. A perfectly positive review with zero criticism is suspicious.'
    },
    sellerMention: {
      test: t => {
        const patterns = [/fast deliver/i, /quick deliver/i, /great seller/i, /trusted seller/i, /good seller/i, /excellent seller/i, /wonderful seller/i, /prompt deliver/i];
        return patterns.filter(p => p.test(t)).length >= 2;
      },
      weight: 11, color: 'red',
      title: 'Excessive seller praise',
      desc: 'Fake reviewers (often incentivized) frequently praise the seller or delivery rather than the actual product.'
    },
    unverifiedGeneric: {
      test: (t, _, name) => {
        const genericNames = [/buyer/i, /customer/i, /user\d*/i, /happy.*\d{2,}/i, /verified/i, /anonymous/i];
        return genericNames.some(p => p.test(name));
      },
      weight: 6, color: 'amber',
      title: 'Generic reviewer username',
      desc: 'Usernames like "HappyCustomer2024" or "VerifiedBuyer" are common with incentivized or fake account networks.'
    },
    goodSigns_specific: {
      test: t => {
        const specifics = [/\d+ (days?|weeks?|months?|year)/i, /compared to/i, /₹\d+/, /\$\d+/, /model \w+/i, /(size|colour|color|variant|version)/i];
        return specifics.filter(p => p.test(t)).length >= 2;
      },
      weight: -14, color: 'green',
      title: 'Contains specific details',
      desc: 'The review mentions specific durations, prices, or product variants — a strong signal of genuine user experience.'
    },
    goodSigns_critique: {
      test: t => {
        const critiqueWords = ['but', 'however', 'although', 'downside', 'issue', 'problem', 'wish', 'could be better', 'except'];
        return critiqueWords.filter(w => t.toLowerCase().includes(w)).length >= 2;
      },
      weight: -12, color: 'green',
      title: 'Balanced with criticism',
      desc: 'Mentions of drawbacks or limitations indicate a genuine, balanced reviewer perspective.'
    },
    goodSigns_length: {
      test: t => t.trim().length > 280,
      weight: -10, color: 'green',
      title: 'Detailed and lengthy review',
      desc: 'Longer reviews with 280+ characters suggest the reviewer invested real effort and likely used the product.'
    },
  };

  /* ── CORE ANALYSIS ── */
  function analyze({ text, rating, reviewerName, category, platform }) {
    const name = reviewerName || '';
    let rawScore = 0;
    const triggeredSignals = [];

    for (const [key, signal] of Object.entries(SIGNALS)) {
      try {
        const triggered = signal.test(text, rating, name, category);
        if (triggered) {
          rawScore += signal.weight;
          triggeredSignals.push({ color: signal.color, title: signal.title, desc: signal.desc, weight: signal.weight });
        }
      } catch(e) {}
    }

    // Clamp to 0–100
    const fakeScore = Math.max(0, Math.min(100, Math.round(rawScore * 2.1 + 15)));

    // Sub-scores
    const words = text.split(/\s+/);
    const avgWordLen = words.reduce((a,w) => a + w.length, 0) / words.length;
    const uniqueRatio = new Set(words.map(w=>w.toLowerCase())).size / words.length;

    const langScore   = Math.max(10, Math.min(95, Math.round(uniqueRatio * 90 + (avgWordLen > 4 ? 15 : 0))));
    const sentScore   = Math.max(10, Math.min(95, Math.round(100 - fakeScore * 0.7)));
    const detailScore = Math.max(10, Math.min(95, Math.round(Math.min(100, text.length / 5))));

    // Sort: red first, then amber, then green
    const order = { red: 0, amber: 1, green: 2 };
    triggeredSignals.sort((a,b) => order[a.color] - order[b.color]);

    // Verdict
    let verdict, verdictEmoji, verdictDesc, recommendation;

    if (fakeScore >= 65) {
      verdict      = 'LIKELY FAKE';
      verdictEmoji = '🚨';
      verdictDesc  = 'Multiple red flags detected. This review shows strong patterns of fake or incentivized content.';
      recommendation = `We strongly recommend treating this ${platform} review with skepticism. Look for other verified purchasers who mention specific product details, usage duration, or mention drawbacks. Check the reviewer's profile for review history — fake accounts often review many unrelated products in quick succession.`;
    } else if (fakeScore >= 38) {
      verdict      = 'SUSPICIOUS';
      verdictEmoji = '⚠️';
      verdictDesc  = 'Some suspicious patterns found. Treat this review with moderate caution.';
      recommendation = `This ${platform} review shows some patterns that can be associated with incentivized or low-quality reviews. It's not definitively fake, but cross-reference with other reviews. Pay attention to whether multiple reviews share similar phrasing or were posted within a short time window.`;
    } else {
      verdict      = 'LIKELY GENUINE';
      verdictEmoji = '✅';
      verdictDesc  = 'Review shows authentic characteristics. Low risk of being fake.';
      recommendation = `This ${platform} review appears to be from a genuine user. It contains specific details, balanced language, and natural patterns consistent with real consumer feedback. Still compare with a range of reviews before making purchasing decisions.`;
    }

    return {
      fakeScore, verdict, verdictEmoji, verdictDesc, recommendation,
      langScore, sentScore, detailScore,
      signals: triggeredSignals.slice(0, 6),
      verdictClass: fakeScore >= 65 ? 'fake' : fakeScore >= 38 ? 'suspicious' : 'genuine',
    };
  }

  return { analyze };
})();
