import { defineComponent } from '@vue/runtime-core'
import { LineBasicMaterial } from 'three'
import { bindProp, bindProps, propsValues } from 'troisjs'
import { default as Material } from 'troisjs/src/materials/Material.js'

export default defineComponent({
  // props: {
  //   color: String,
  // },
  extends: Material,
  methods: {
    createMaterial() {
      const material = new LineBasicMaterial(this.$props)
      bindProp(this, 'normalScale', material)
      // bindProps(this, Object.keys(wireframeProps), material)
      return material
    },
  },
  __hmrId: 'LineBasicMaterial',
})
