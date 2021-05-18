import { defineComponent } from '@vue/runtime-core'
import { Color } from 'three'
import { ShaderMaterial } from 'troisjs'

const vertexShader = `
    varying vec3 vPos;
    void main()	{
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `
const fragmentShader = `
		//#extension GL_OES_standard_derivatives : enable
    
    varying vec2 vUv;
    uniform float thickness;
   	
    float edgeFactor(vec2 p){
    	vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
  		return min(grid.x, grid.y);
    }
    
    void main() {
			
      float a = edgeFactor(vUv);
      
      vec3 c = mix(vec3(1), vec3(0), a);
      
      gl_FragColor = vec4(c, 1.0);
    }
  `

export const LineCubeMaterial = defineComponent({
  name: 'LineCubeMaterial',
  extends: ShaderMaterial,
  props: {
    uniforms: {
      type: Object,
      default: () => defaultUniforms,
    },
    vertexShader: { type: String, default: vertexShader },
    fragmentShader: { type: String, default: fragmentShader },
    transparent: {
      type: Boolean,
      default: true,
    },
  },
})

export function buildMeshLineUniforms(unitform: UserUnitforms) {
  const newUnitforms = Object.assign({}, defaultUniforms)
  Object.entries(unitform).forEach(([k, v]) => {
    newUnitforms[k as keyof UserUnitforms] = {
      value: v as number,
    }
  })

  return newUnitforms
}

type UserUnitforms = Partial<{
  thickness: number
  color: (Color & number) | number
}>

const defaultUniforms = {
  thickness: {
    value: 1.5,
  },
  color: { value: new Color(0xffffff) as any as number },
}
