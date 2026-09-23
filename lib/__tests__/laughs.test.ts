import { describe, expect, it } from 'vitest'

import { countLaughs } from '../laughs'

describe('counting laughs with a breakdown', () => {
  it('counts the acceptance-criteria string as five laughs', () => {
    const { total, byVariant } = countLaughs('jajaja JAJAJA xd lol 😂 hola')

    expect(total).toBe(5)
    expect(byVariant).toEqual({
      jaja: 1,
      JAJA: 1,
      jsjs: 0,
      xd: 1,
      lol: 1,
      haha: 0,
      '😂': 1,
    })
  })

  it('counts a run as one laugh, however long it is', () => {
    expect(countLaughs('jajajajajajaja').total).toBe(1)
    expect(countLaughs('jaja jaja').total).toBe(2)
  })

  it('tells shouting apart from ordinary laughing', () => {
    expect(countLaughs('JAJAJA').byVariant.JAJA).toBe(1)
    expect(countLaughs('jajaja').byVariant.jaja).toBe(1)
    expect(countLaughs('Jajaja').byVariant.jaja).toBe(1)
  })

  it('recognises the other dialects', () => {
    expect(countLaughs('jsjsjs').byVariant.jsjs).toBe(1)
    expect(countLaughs('XDDD').byVariant.xd).toBe(1)
    expect(countLaughs('lolol').byVariant.lol).toBe(1)
    expect(countLaughs('hahaha').byVariant.haha).toBe(1)
    expect(countLaughs('🤣').byVariant['😂']).toBe(1)
  })

  it('does not fire on ordinary words that contain the letters', () => {
    const { total } = countLaughs('ahora la lola comió una paja de jalea')
    expect(total).toBe(0)
  })

  it('returns zero for text with no laughing in it', () => {
    const { total, byVariant } = countLaughs('nos vemos mañana a las ocho')

    expect(total).toBe(0)
    expect(Object.values(byVariant).every((n) => n === 0)).toBe(true)
  })
})
