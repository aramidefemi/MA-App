# AI Can Detect Hate Speech. Just Not Yours.

*A look at who AI safety benchmarking was built for — and who it left out.*

***

There is a benchmark called ToxiGen. It contains 274,000 examples of toxic and benign language, built specifically to catch hate speech that doesn't use slurs or profanity — the subtle stuff. There is WildGuard, a classifier that reduced successful jailbreak attacks on AI models from nearly 80% down to under 3%. There is MinorBench, built from a real middle school deployment in Singapore, designed to test whether AI chatbots are safe for children.

The field of AI content safety benchmarking is real. It is active. It is well-funded.

It was almost entirely built in English, by Western institutions, for Western contexts.

***

## The number that matters

Africa has approximately 2,000 languages.

AI content moderation systems actively cover fewer than 20 of them.

This isn't a gap at the fringes. Hausa has over 70 million speakers. Yorùbá has 45 million. Nigerian Pidgin is the everyday language of communication across Nigeria — codeswitched, expressive, politically loaded, and essentially invisible to every major content moderation system deployed at scale.

Swahili hate speech goes undetected. Hausa moderation is documented to have gaps. Researchers have shown that including a single Yorùbá word in an otherwise English prompt is enough to destabilize outputs from major LLMs — producing partial mistranslations, or responses unrelated to the original query entirely.

***

## What does exist

The researchers working on this are doing real work, largely without the resources or institutional backing their Western counterparts receive.

**AfriHate** is the most comprehensive effort — a collection of hate speech and abusive language datasets across 15 African languages, including Igbo, Hausa, Yorùbá, Nigerian Pidgin, Twi, Swahili, and Amharic. Annotated by native speakers. Built to capture the cultural and political specificity that outside annotators miss.

**HausaNLP** built sentiment datasets for Hausa, Igbo, Yorùbá, and Nigerian Pidgin — roughly 30,000 annotated tweets per language — with a direct focus on hate speech detection. The motivation was simple and damning: Twitter can automatically block offensive content in English. It has no equivalent for Nigerian languages.

A team at Bayero University Kano built an offensive language dataset specifically for Hausa, Yorùbá, and Igbo scraped from Twitter, annotated by native speakers, with their best model reaching 90% accuracy.

Work is happening. But it is fragmented, under-resourced, and not integrated into the mainstream safety systems actually deployed at scale.

***

## The structural problem nobody wants to say out loud

Here is the thing that should bother people more than it does.

A significant share of the annotation labor that trains global AI safety systems is done by Nigerian and Kenyan workers. The data-labeling industry is estimated at \$2.8 billion globally, and it depends heavily on African annotators marking up the examples that teach AI what harm looks like.

Those same systems, trained on that labor, provide no equivalent protection for African language users.

The people doing the work to make AI safe — in one of the most literal senses possible — are not protected by the product of that work.

***

## The unsolved problem: Nigerian Pidgin

If you want a concrete research problem that is genuinely unsolved and genuinely important, here it is.

Nigerian Pidgin is codeswitched by nature. English and Naija blend mid-sentence, sometimes mid-word. Context determines whether a phrase is affectionate or hostile. Certain expressions carry political or ethnic meaning legible only to native speakers with the right cultural frame.

Standard toxicity classifiers assume a single input language. Pidgin structurally breaks that assumption.

No meaningful safety benchmark exists for it.

Beyond the safety gap, there is an adversarial risk here that nobody in the mainstream AI safety community is talking about: codeswitching as a moderation evasion technique. Harmful content embedded in a language your moderation stack doesn't cover stays up by default. This isn't hypothetical — it's documented. It just isn't framed as a safety attack surface yet.

***

## What needs to happen

For researchers: the next MinorBench — testing LLM child safety specifically in Yorùbá, Igbo, and Hausa — doesn't exist. The Nigerian Pidgin toxicity benchmark doesn't exist. A unified taxonomy for African language harmful content that lets us compare models across datasets doesn't exist. These are not exotic problems. They are straightforward extensions of work that has already been done in English, waiting for someone with the right background and the right motivation to pick them up.

For everyone else: ask. If you work in tech, ask your safety team which languages your moderation covers. Ask why Nigerian Pidgin isn't on the roadmap. Ask who is doing the annotation work and whether they are protected by the systems they are training. Those questions, asked by the right people in the right rooms, are not nothing.

***

The infrastructure for AI safety exists.

It just wasn't built for us.

And the people closest to the problem — who speak the languages, understand the cultural context, and in many cases are already doing the annotation labor — are the ones best positioned to fix it.

***

*Research notes and sources for this piece:* *[findings.md](./findings.md)* *|* *[gaps-and-call-to-action.md](./gaps-and-call-to-action.md)*
