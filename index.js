/**
 * 「发送按钮」—— 宿主半区。
 *
 * 这个插件的能力全在浏览器里（往输入框的工具栏注册一个按钮），
 * 宿主侧不需要任何服务、路由或落盘，所以这个文件只做一个空壳：
 * 让 `cordis.patch.yml` 里那一行有东西可挂，并把包名报给加载器。
 */

/** 插件名（诊断日志里显示）。 */
export const name = 'dsh-continue-button'

/** 与 package.json 对齐。 */
export const VERSION = '1.0.0'

/**
 * 插件入口。宿主侧没有要做的事。
 * @param ctx - Cordis 上下文。
 */
export function apply(ctx) {
  ctx.logger?.('dsh-continue-button')?.info?.('[dsh-continue-button] 宿主半为空壳，界面在浏览器半区')
}
