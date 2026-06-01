import { commonmark, strongInputRule, strongSchema } from '@milkdown/kit/preset/commonmark'
import { markRule } from '@milkdown/prose'
import { $inputRule } from '@milkdown/utils'

/** Same boundary checks as preset strong rule, without lookbehind (Safari <16.4 / older WKWebView). */
const strongInputRuleSafe = $inputRule((ctx) =>
  markRule(
    /(?:^|[^\w:/])(?:\*\*|__)([^*_]+?)(?:\*\*|__)(?!\w|\/)$/,
    strongSchema.type(ctx),
    {
      getAttr: (match) => ({
        marker: match[0].startsWith('*') ? '*' : '_',
      }),
    },
  ),
)

/** Commonmark preset with WebKit-safe bold input rule. */
export const commonmarkIntegration = [
  ...commonmark.filter((plugin) => plugin !== strongInputRule),
  strongInputRuleSafe,
].flat()
