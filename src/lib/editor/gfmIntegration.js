import {
  gfm,
  strikethroughInputRule,
  strikethroughSchema,
} from '@milkdown/kit/preset/gfm'
import { markRule } from '@milkdown/prose'
import { $inputRule } from '@milkdown/utils'

/** Same boundary checks as preset strikethrough rule, without lookbehind (Safari <16.4 / older WKWebView). */
const strikethroughInputRuleSafe = $inputRule((ctx) =>
  markRule(
    /(?:^|[^\w:/])(~{1,2})(.+?)\1(?!\w|\/)/,
    strikethroughSchema.type(ctx),
  ),
)

/** GFM preset: tables, task lists, strikethrough, footnotes. Use after commonmark. */
export const gfmIntegration = [
  ...gfm.filter((plugin) => plugin !== strikethroughInputRule),
  strikethroughInputRuleSafe,
].flat()
