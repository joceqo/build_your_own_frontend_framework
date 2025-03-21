import { destroyDOM } from './destroy-dom'
import { mountDOM } from './mount-dom'
import { patchDOM } from './patch-dom'
import { DOM_TYPES, extractChildren } from './h'
import { hasOwnProperty } from './utils/objects'

export function defineComponent({ render, state, ...methods }) {
  class Component {
    #isMounted = false
    #vdom = null
    #hostEl = null

    constructor(props = {}) {
      this.props = props
      this.state = state ? state(props) : {}
    }

    get elements() {
      if (this.#vdom == null) {  
        return []
      }

      if (this.#vdom.type === DOM_TYPES.FRAGMENT) {  
        return extractChildren(this.#vdom).flatMap((child) => {
          if(child.type === DOM_TYPES.COMPONENT){
            return child.component.elements
          }

          return [child.el]
        })
      }

      return [this.#vdom.el]  
    }

    get firstElement() {
      return this.elements[0]  
    }

    get offset() {
      if (this.#vdom.type === DOM_TYPES.FRAGMENT) {  
        return Array.from(this.#hostEl.children).indexOf(this.firstElement)
      }

      return 0  
    }

    updateProps(props) {
      this.props = { ...this.props, ...props }      
      this.#patch()                                
    }

    updateState(state) {
      this.state = { ...this.state, ...state }
      this.#patch()
    }

    render() {
      return render.call(this)
    }

    mount(hostEl, index = null) {
      if (this.#isMounted) {
        throw new Error('Component is already mounted')
      }

      this.#vdom = this.render()
      mountDOM(this.#vdom, hostEl, index, this)

      this.#hostEl = hostEl
      this.#isMounted = true
    }

    unmount() {
      if (!this.#isMounted) {
        throw new Error('Component is not mounted')
      }

      destroyDOM(this.#vdom)

      this.#vdom = null
      this.#hostEl = null
      this.#isMounted = false
    }

    #patch() {
      if (!this.#isMounted) {
        throw new Error('Component is not mounted')
      }

      const vdom = this.render()
      this.#vdom = patchDOM(this.#vdom, vdom, this.#hostEl, this)
    }
  }

  for (const methodName in methods) {
    if(hasOwnProperty(Component, methodName)){
      throw new Error(
        `Method "${methodName}()" already exists in the component.`
      )
    }

    Component.prototype[methodName] = methods[methodName]     
  }

  return Component
}