/**
 * 「发送按钮」—— 浏览器半区。
 *
 * 在输入框右下工具行、官方「发送」按钮的左边多一个按钮：
 *   · 点一下 —— 把按钮上的文本当成一次普通提问发出去（走官方 inputActions，
 *     和按发送键同一条路：排队、本地回显、失败恢复都由宿主自己管）；
 *   · 右键、或点悬停才露出来的铅笔 —— 就地改这段文本，改完存 localStorage。
 *
 * 为什么用 inputActions 而不是自己调远端：
 *   `inputActions` 是输入框槽位公开给我的标准 prop（`setDraft` / `submit`），
 *   `submit()` 会把当前草稿抄进这次提交再交给提交状态机，所以我可以先把草稿
 *   换成按钮文本、提交、再把用户原来的草稿还回去，全程不碰会话远端。
 *
 * 本文件是纯 JavaScript，没有构建步骤：React 从浏览器的模块表里 require。
 */

window.__ModuleLoader__.load({
  id: 'dsh-continue-button',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** 目标槽位：输入框工具行、官方发送按钮之前。 */
    const SLOT = 'conversation.input.right'
    /** 槽位条目 id（也是本插件在注册表里的名字）。 */
    const ENTRY_ID = 'dsh-continue-button'
    /** 字典命名空间。 */
    const NS = 'dsh-continue-button'
    /** 按钮文本存这里：按浏览器记住，刷新不丢。 */
    const STORAGE_KEY = 'dsh-continue-button:text'
    /** 样式表元素 id：重复挂载时不重复插。 */
    const STYLE_ID = 'dsh-continue-button-style'
    /** 文本长度上限——它是个按钮，不是输入框。 */
    const MAX_LEN = 120

    /**
     * 中英文字典。DSH 的 locale 服务要求一次把两种语言都注册齐；
     * 缺 key 时服务会回退到 common 命名空间，最后才显示 key 本身。
     */
    const DICT = {
      zh: {
        defaultText: '继续',
        sendHint: '点一下就把这段文字发出去',
        editHint: '改要发送的文本',
        editLabel: '要发送的文本',
        placeholder: '要发送的文本',
      },
      en: {
        defaultText: 'Continue',
        sendHint: 'Click to send this text',
        editHint: 'Edit the text to send',
        editLabel: 'Text to send',
        placeholder: 'Text to send',
      },
    }

    /**
     * 全部样式都用主题 token，跟着浅色/深色自动走。
     * 尺寸对齐输入框工具行里那些紧凑控件（高 28px、字号 13px）。
     */
    const CSS = `
.dshCbRoot { display: inline-flex; align-items: center; flex: none; height: 28px; max-width: 190px; margin-left: 2px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm, 6px); background: transparent; overflow: hidden; vertical-align: middle; }
.dshCbRoot:hover, .dshCbRoot:focus-within { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l3, var(--dsw-alias-border-l2)); }
.dshCbSend { display: inline-flex; align-items: center; min-width: 0; height: 100%; padding: 0 2px 0 9px; border: 0; background: none; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; font-weight: 500; line-height: 20px; white-space: nowrap; cursor: pointer; }
.dshCbRoot:hover .dshCbSend, .dshCbRoot:focus-within .dshCbSend { color: var(--dsw-alias-label-primary); }
.dshCbSend:disabled { cursor: default; color: var(--dsw-alias-label-dimmed, var(--dsw-alias-label-tertiary)); }
.dshCbSend:focus-visible { outline: none; }
.dshCbText { min-width: 0; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.dshCbEditBtn { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 22px; height: 100%; padding: 0; border: 0; background: none; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); opacity: .4; cursor: pointer; transition: opacity .12s ease; }
.dshCbRoot:hover .dshCbEditBtn, .dshCbRoot:focus-within .dshCbEditBtn { opacity: 1; }
.dshCbEditBtn:hover { color: var(--dsw-alias-label-primary); }
.dshCbEditBtn:focus-visible { outline: none; opacity: 1; box-shadow: inset 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); border-radius: 4px; }
.dshCbEdit { display: inline-flex; align-items: center; flex: none; height: 28px; margin-left: 2px; }
.dshCbInput { box-sizing: border-box; width: 132px; height: 28px; padding: 0 8px; border: 1px solid var(--dsw-alias-brand-primary); border-radius: var(--dsw-radius-sm, 6px); background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base)); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; outline: none; }
.dshCbInput::placeholder { color: var(--dsw-alias-label-tertiary); opacity: .7; }
`

    /** 把样式表挂进文档头；返回摘掉它的函数（卸载时由 ctx.effect 调用）。 */
    function insertStyles() {
      const existing = document.getElementById(STYLE_ID)
      if (existing !== null) return () => {}
      const element = document.createElement('style')
      element.id = STYLE_ID
      element.textContent = CSS
      document.head.appendChild(element)
      return () => {
        element.remove()
      }
    }

    /** 读回上次改好的文本；读不到（首次、隐私模式）就交给调用方的默认值。 */
    function readStored(fallback) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (typeof raw === 'string' && raw.trim() !== '') return raw.trim().slice(0, MAX_LEN)
      } catch {
        /* localStorage 可能被禁：不影响这一次使用 */
      }
      return fallback
    }

    /** 记住这段文本。写不进去也只是下次回到默认值，不算失败。 */
    function writeStored(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, value)
      } catch {
        /* 同上 */
      }
    }

    /**
     * 取翻译函数：优先用槽位给的那份（跟随 DSH 语言设置），
     * 拿不到或者 key 没翻出来，就退回内置中文，至少不会显示成 key。
     * @param {object} props - 槽位交进来的 props。
     * @returns {(key: string) => string} 翻译函数。
     */
    function translator(props) {
      const raw = props !== null && typeof props === 'object' && typeof props.t === 'function' ? props.t : undefined
      return (key) => {
        if (raw !== undefined) {
          try {
            const value = raw(key)
            if (typeof value === 'string' && value !== '' && value !== key) return value
          } catch {
            /* 落到内置字典 */
          }
        }
        return DICT.zh[key] ?? key
      }
    }

    /** 铅笔图标（跟随 currentColor，不占位时也不影响排版）。 */
    function pencil() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 12,
          height: 12,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', {
          d: 'M11.3 2.2 13.8 4.7 5.2 13.3 2.2 13.8 2.7 10.8Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    /**
     * 按钮本体：平时是「文本 + 铅笔」的小药丸，编辑时变成一个输入框。
     * @param {object} props - 槽位 props（含 t / useInput / inputActions）。
     * @returns {object} React 元素。
     */
    function ContinueButtonInner(props) {
      const t = translator(props)
      const actions = props.inputActions
      // 两个选择器都是标量，输入框每敲一个字只会让这个小按钮重渲染一次。
      const draft = props.useInput((state) => (typeof state?.draft === 'string' ? state.draft : ''))
      const phase = props.useInput((state) => (typeof state?.phase === 'string' ? state.phase : 'plain'))

      // 默认值按当前界面语言给（中文「继续」、英文 Continue）；改过一次之后就用存的。
      const [text, setText] = React.useState(() => readStored(t('defaultText')))
      const [editing, setEditing] = React.useState(false)
      const [buffer, setBuffer] = React.useState(text)
      const inputRef = React.useRef(null)
      // Esc 取消时输入框会被卸载，浏览器可能补一个 blur，别让那一下把改动又存回去。
      const cancelledRef = React.useRef(false)

      // 进编辑态就把焦点和选区交给输入框，省掉一次点击。
      React.useEffect(() => {
        if (!editing) return
        const element = inputRef.current
        if (element === null || element === undefined) return
        element.focus()
        element.select()
      }, [editing])

      const usable = actions !== null && typeof actions === 'object'
        && typeof actions.setDraft === 'function'
        && typeof actions.submit === 'function'
      const locked = phase === 'adjudicating' || phase === 'submitting' || phase === 'claimed'
      const value = text.trim()
      const disabled = !usable || locked || value === ''

      /** 发送：把草稿换成按钮文本、提交、再把用户原来的草稿还回去。 */
      const send = () => {
        if (disabled) return
        const previous = draft
        try {
          actions.setDraft(value)
          actions.submit()
        } catch (error) {
          console.error('[dsh-continue-button] 发送失败：', error)
          return
        }
        // submit() 在调用那一刻就把文本抄进本次提交里了，所以这里还草稿是安全的。
        if (previous !== '' && previous !== value) {
          try {
            actions.setDraft(previous)
          } catch {
            /* 还不了就算了，别挡住已经发出去的那一条 */
          }
        }
      }

      const beginEdit = () => {
        cancelledRef.current = false
        setBuffer(text)
        setEditing(true)
      }

      const commitEdit = () => {
        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }
        const next = buffer.trim().slice(0, MAX_LEN)
        setEditing(false)
        if (next === '' || next === text) return
        setText(next)
        writeStored(next)
      }

      const cancelEdit = () => {
        cancelledRef.current = true
        setEditing(false)
        setBuffer(text)
      }

      if (editing) {
        return h(
          'span',
          { className: 'dshCbEdit' },
          h('input', {
            ref: inputRef,
            className: 'dshCbInput',
            type: 'text',
            value: buffer,
            maxLength: MAX_LEN,
            'aria-label': t('editLabel'),
            placeholder: t('placeholder'),
            onChange: (event) => setBuffer(event.target.value),
            // 键盘留在自己的输入框里：别让 Esc、空格这些冒泡到输入框的快捷键。
            onKeyDown: (event) => {
              event.stopPropagation()
              if (event.key === 'Enter') {
                event.preventDefault()
                commitEdit()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                cancelEdit()
              }
            },
            onKeyUp: (event) => event.stopPropagation(),
            onKeyPress: (event) => event.stopPropagation(),
            onBlur: commitEdit,
          }),
        )
      }

      return h(
        'span',
        { className: 'dshCbRoot' },
        h(
          'button',
          {
            type: 'button',
            className: 'dshCbSend',
            title: t('sendHint'),
            disabled,
            onClick: send,
          },
          h('span', { className: 'dshCbText' }, value),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'dshCbEditBtn',
            title: t('editHint'),
            'aria-label': t('editHint'),
            onClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              beginEdit()
            },
          },
          pencil(),
        ),
      )
    }

    /**
     * 兜底边界：按钮里任何东西抛了，就当作这里没有按钮，
     * 绝不让它把输入框那一排一起带崩。
     */
    class ContinueBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      componentDidCatch(error) {
        console.error('[dsh-continue-button] 渲染失败，本次不显示按钮：', error)
      }

      render() {
        return this.state.failed ? null : this.props.children
      }
    }

    /**
     * 槽位入口。先确认标准 prop 都在（没有会话的 inert 状态下可能缺），
     * 再把真正的按钮挂上去——hooks 只在确定能跑的时候调用。
     * @param {object} props - 槽位 props。
     * @returns {object|null} React 元素，或者什么都不渲染。
     */
    function ContinueButton(props) {
      if (props === null || typeof props !== 'object') return null
      if (typeof props.useInput !== 'function') return null
      if (props.inputActions === null || typeof props.inputActions !== 'object') return null
      return h(ContinueBoundary, null, h(ContinueButtonInner, props))
    }

    return {
      inject: ['slots', 'locale'],

      /**
       * 注册字典、样式表和一个槽位条目。
       * @param {object} ctx - 浏览器侧 Cordis 上下文。
       */
      apply(ctx) {
        const locale = ctx.get('locale')
        if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(NS, DICT), 'continue-button: dictionaries')
        }

        ctx.effect(() => insertStyles(), 'continue-button: styles')

        ctx.slots.inject(SLOT, () => ctx.slots.register(
          { name: SLOT, id: ENTRY_ID, order: 95, locale: NS },
          ContinueButton,
        ))
      },
    }
  },
})
