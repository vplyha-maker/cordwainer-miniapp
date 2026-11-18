import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenMaterials?: () => void
  onOpenStyles?: () => void
  onOpenCalc?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style)
  } catch {}
}

const GLYPHS = {
  T: 'M1.188-20.556V-2.268A1.831,1.831,0,0,0,2.268-.612,2.166,2.166,0,0,0,3.312-.36h.4V0H-3.708V-.36h.432A2.076,2.076,0,0,0-1.8-.936,1.945,1.945,0,0,0-1.152-2.3V-20.556H-7.668a1.68,1.68,0,0,0-1.314.54,1.87,1.87,0,0,0-.486,1.3v.576h-.4v-4.068a8.071,8.071,0,0,0,2.034.432q1.314.144,1.962.144H5.868A11.217,11.217,0,0,0,9.9-22.212v4.068H9.5v-.576a1.833,1.833,0,0,0-.5-1.3,1.693,1.693,0,0,0-1.3-.54Z',
  H: 'M4.572-.36a2.068,2.068,0,0,0,1.44-.558,1.884,1.884,0,0,0,.648-1.35v-7.848H-6.624v7.848a1.884,1.884,0,0,0,.648,1.35,2.068,2.068,0,0,0,1.44.558H-4.1V0h-7.344V-.36h.432A2.014,2.014,0,0,0-9.558-.936,1.974,1.974,0,0,0-8.928-2.3V-19.3a1.945,1.945,0,0,0-.648-1.368,2.032,2.032,0,0,0-1.44-.576h-.432v-.36H-4.1v.36h-.432a2.068,2.068,0,0,0-1.44.558,1.884,1.884,0,0,0-.648,1.35V-11.2H6.66v-8.1a1.583,1.583,0,0,0-.468-1.224,2.321,2.321,0,0,0-1.62-.72H4.14v-.36h7.344v.36h-.432a2.106,2.106,0,0,0-1.44.54,1.825,1.825,0,0,0-.648,1.332v17.1A1.64,1.64,0,0,0,9.432-1.08a2.409,2.409,0,0,0,1.62.72h.432V0H4.14V-.36Z',
  E: 'M-7.344-.36A2.05,2.05,0,0,0-5.886-.918a1.911,1.911,0,0,0,.63-1.35v-17.1A1.707,1.707,0,0,0-5.868-20.7a2.154,2.154,0,0,0-1.476-.54h-.5v-.36H2.664a13.77,13.77,0,0,0,2.592-.216,8.4,8.4,0,0,0,1.44-.36v4.1l-.4-.036v-.54a1.833,1.833,0,0,0-.5-1.3,1.693,1.693,0,0,0-1.3-.54H-2.988v9.144H3.168a1.381,1.381,0,0,0,1.1-.432,1.581,1.581,0,0,0,.378-1.08v-.468h.4v5.04h-.4v-.468a1.37,1.37,0,0,0-.756-1.368,2.532,2.532,0,0,0-.612-.144H-2.988v9.144H2.664a6.115,6.115,0,0,0,2.79-.576A4.857,4.857,0,0,0,7.182-3.06,12.218,12.218,0,0,0,8.388-5.148h.36L6.768,0H-7.848V-.36Z',
  C: 'M.99.5Q-4.518.468-7.7-2.556a10.847,10.847,0,0,1-3.186-8.262A10.847,10.847,0,0,1-7.7-19.08Q-4.518-22.1.99-22.1a18.225,18.225,0,0,1,4.5.576,14.265,14.265,0,0,1,3.924,1.584l.792,5.112H9.882Q8.334-21.024.954-21.024a8.685,8.685,0,0,0-6.768,2.736A10.724,10.724,0,0,0-8.3-10.8,12.141,12.141,0,0,0-7.182-5.418a8.211,8.211,0,0,0,3.24,3.546A9.483,9.483,0,0,0,.99-.612,13.127,13.127,0,0,0,5.9-1.458,7.8,7.8,0,0,0,9.4-4.248a9.113,9.113,0,0,0,1.566-4.824h.324l-.4,4.932a9.474,9.474,0,0,1-4.068,3.4A13.63,13.63,0,0,1,.99.5Z',
  O: 'M-6.084-20.664a13.036,13.036,0,0,1,6.1-1.44,13.171,13.171,0,0,1,6.1,1.422,11.121,11.121,0,0,1,4.41,4.014A10.752,10.752,0,0,1,12.168-10.8,10.752,10.752,0,0,1,10.53-4.932,11.121,11.121,0,0,1,6.12-.918,12.325,12.325,0,0,1,.432.5,14.755,14.755,0,0,1-4.716-.324a11.888,11.888,0,0,1-3.87-2.3,10.652,10.652,0,0,1-2.592-3.6,12.079,12.079,0,0,1-.954-4.986,10.051,10.051,0,0,1,1.638-5.454A10.991,10.991,0,0,1-6.084-20.664ZM-6.768-3.42A9.016,9.016,0,0,0,0-.576,8.988,8.988,0,0,0,6.768-3.438,10.217,10.217,0,0,0,9.5-10.8a10.217,10.217,0,0,0-2.736-7.362A8.988,8.988,0,0,0,0-21.024a8.931,8.931,0,0,0-6.75,2.862A10.255,10.255,0,0,0-9.468-10.8,10.359,10.359,0,0,0-6.768-3.42Z',
  R: 'M-2.574-20.484H-4.482V-2.3A1.93,1.93,0,0,0-3.474-.612,2.166,2.166,0,0,0-2.43-.36h.468l.036.36h-7.38V-.36h.5A2,2,0,0,0-7.38-.918a1.785,1.785,0,0,0,.594-1.35v-17.1A1.729,1.729,0,0,0-7.38-20.7,2.041,2.041,0,0,0-8.8-21.24h-.5v-.36H-.27a8.408,8.408,0,0,1,5.346,1.548,4.932,4.932,0,0,1,1.962,4.068,5.926,5.926,0,0,1-1.584,4.212A6.2,6.2,0,0,1,1.422-9.828,8.136,8.136,0,0,1,4.194-7.02q-.036,0,1.242,1.584T7.488-2.97q.774.882,1.278,1.35a4.325,4.325,0,0,0,3.06,1.26V0H10.71A7.774,7.774,0,0,1,6.246-1.116,10.552,10.552,0,0,1,4.014-3.168Q3.8-3.456,2.2-5.706T.486-8.1q-1.944-2.412-3.636-2.412v-.36q4.212,0,5.076-.432a4.07,4.07,0,0,0,1.62-1.3,5.86,5.86,0,0,0,.9-3.168,4.36,4.36,0,0,0-1.3-3.384,5.379,5.379,0,0,0-3.492-1.3Q-1.314-20.484-2.574-20.484Z',
  D: 'M11.88-10.8A10.268,10.268,0,0,1,8.766-2.9,11.9,11.9,0,0,1,.324,0H-11.7V-.36h.468a1.954,1.954,0,0,0,1.44-.576A2,2,0,0,0-9.18-2.3V-19.3a1.924,1.924,0,0,0-.63-1.4,2.088,2.088,0,0,0-1.458-.54H-11.7v-.36H.324a13.648,13.648,0,0,1,6.138,1.3,9.255,9.255,0,0,1,4.014,3.744A11.38,11.38,0,0,1,11.88-10.8ZM-6.84-20.52V-1.08H.324A8.484,8.484,0,0,0,6.876-3.69,10.068,10.068,0,0,0,9.288-10.8a10.068,10.068,0,0,0-2.412-7.11A8.484,8.484,0,0,0,.324-20.52Z',
  W: 'M15.12-21.6v.36h-.288a2.4,2.4,0,0,0-1.44.522,4.1,4.1,0,0,0-1.15,1.566L5.58.5H5.22L.18-13.14-4.86.5h-.36L-12.15-19.152a3.8,3.8,0,0,0-1.12-1.566,2.3,2.3,0,0,0-1.45-.522H-15.0v-.36h6.48v.36h-.288a1.15,1.15,0,0,0-.98.486,1.55,1.55,0,0,0-.32.882,3.4,3.4,0,0,0,.12.828L-4.32-3.42-.18-14.76l-.9-2.484a3.2,3.2,0,0,0-.95-1.476,2.1,2.1,0,0,0-1.35-.486h-.28v-.36h6.48v.36H2.52a1.15,1.15,0,0,0-.98.486,1.55,1.55,0,0,0-.32.882,3.4,3.4,0,0,0,.12.828L5.94-3.42l5.22-15.552a2.5,2.5,0,0,0,.18-.882,1.55,1.55,0,0,0-.36-.9,1.25,1.25,0,0,0-1.08-.486H9.62v-.36Z',
  A: 'M11.826-.36h.288V0H4.734V-.36h.288A1.237,1.237,0,0,0,6.066-.828a1.476,1.476,0,0,0,.36-.882,2.353,2.353,0,0,0-.144-.81L4.3-7.308H-4.806l-1.98,4.68a2.462,2.462,0,0,0-.18.882,1.551,1.551,0,0,0,.36.9,1.258,1.258,0,0,0,1.08.486h.288V0h-6.876V-.36h.288A2.729,2.729,0,0,0-10.3-.882,3.844,3.844,0,0,0-9.018-2.448Q-1.134-19.3-.81-20.088A8.708,8.708,0,0,0-.162-22.1H.162L9.054-2.448A3.131,3.131,0,0,0,11.826-.36ZM-4.338-8.388H3.87L-.162-18.252Z',
  I: 'M-3.564-.36A2.627,2.627,0,0,0-1.872-.936,1.709,1.709,0,0,0-1.152-2.3V-19.3a1.709,1.709,0,0,0-.72-1.368A2.68,2.68,0,0,0-3.6-21.24h-.468v-.36H4.068v.36H3.6a2.665,2.665,0,0,0-1.674.54,1.85,1.85,0,0,0-.774,1.332v17.1a1.769,1.769,0,0,0,.756,1.35A2.682,2.682,0,0,0,3.6-.36h.468L4.1,0H-4.068V-.36Z',
  N: 'M12.15-21.24a1.969,1.969,0,0,0-1.368.522,1.78,1.78,0,0,0-.612,1.278V-4.1a29.7,29.7,0,0,0,.252,3.96L10.494.5H10.17L-8.55-17.244V-2.232A1.753,1.753,0,0,0-7.974-.9a1.977,1.977,0,0,0,1.4.54h.612V0h-6.8V-.36h.612a1.977,1.977,0,0,0,1.4-.54,1.753,1.753,0,0,0,.576-1.332V-17.64a27.41,27.41,0,0,0-.252-3.924l-.072-.576.4.036L8.586-4.5V-19.44a1.918,1.918,0,0,0-.648-1.278A1.969,1.969,0,0,0,6.57-21.24H5.958v-.36h6.8v.36Z',
  G1: 'M6.012-18.612a5.428,5.428,0,0,1,.54,2.52,3.862,3.862,0,0,1-1.188,2.718,5.69,5.69,0,0,1-2.772,1.638A7.259,7.259,0,0,1,6.93-9.828,4.826,4.826,0,0,1,8.64-6.282,6.03,6.03,0,0,1,7.9-3.132,4.982,4.982,0,0,1,5.94-1.26,10.983,10.983,0,0,1,.648,0H-8.28V-.36h.432A2.161,2.161,0,0,0-6.336-.918,1.919,1.919,0,0,0-5.688-2.3V-19.3a1.807,1.807,0,0,0-1.08-1.692,2.243,2.243,0,0,0-1.08-.252H-8.28v-.36H-.936Q4.428-21.6,6.012-18.612ZM6.084-6.048q0-5.364-8.388-5.364v-.36q6.336,0,6.336-4.428,0-4.32-5-4.32H-3.42V-1.08H.612a6.039,6.039,0,0,0,3.96-1.242A4.541,4.541,0,0,0,6.084-6.048Z',
  G2: 'M-1.71-10.224A6.034,6.034,0,0,0-.2-10.008q.684,0,1.116-.036a8.3,8.3,0,0,0,1.224-.234,4.573,4.573,0,0,0,1.44-.63A5.484,5.484,0,0,0,5.814-13.86,6.059,6.059,0,0,0,6.066-15.8,4.258,4.258,0,0,0,4.554-19.26,6.332,6.332,0,0,0,.378-20.52H-3.114V-2.3A1.864,1.864,0,0,0-2.07-.612,2.166,2.166,0,0,0-1.026-.36h.5V0H-7.974V-.36h.5A2.05,2.05,0,0,0-6.012-.918a1.911,1.911,0,0,0,.63-1.35V-19.332a1.886,1.886,0,0,0-.63-1.368,2.088,2.088,0,0,0-1.458-.54h-.5v-.36H.45a9.788,9.788,0,0,1,5.994,1.656A5.287,5.287,0,0,1,8.658-15.48a6.565,6.565,0,0,1-.936,3.528A6.224,6.224,0,0,1,2.034-9,8.708,8.708,0,0,1-1.71-9.864Z',
  G3: 'M6.858-18.648A1.7,1.7,0,0,0,5.814-20.34a2.017,2.017,0,0,0-.756-.144h-7.6v9.144H3.726a1.325,1.325,0,0,0,1.08-.432,1.63,1.63,0,0,0,.36-1.08v-.468H5.6v5.04H5.166v-.468a1.42,1.42,0,0,0-.576-1.26A1.628,1.628,0,0,0,3.8-10.26H-2.538V-2.3A1.984,1.984,0,0,0-1.674-.72a2.218,2.218,0,0,0,1.26.36h.5V0H-7.434V-.36h.5A2.113,2.113,0,0,0-5.454-.918a1.884,1.884,0,0,0,.648-1.35v-17.1a1.761,1.761,0,0,0-1.044-1.62,2.382,2.382,0,0,0-1.08-.252h-.5v-.36H3.186a16.4,16.4,0,0,0,2.3-.18,7.838,7.838,0,0,0,1.764-.4v4.1l-.4-.036Z',
  G4: 'M-6.228-1.188a9.005,9.005,0,0,1-.108-1.764,8.305,8.305,0,0,1,.468-2.7h.432A5.863,5.863,0,0,0-5.472-5,4.249,4.249,0,0,0-4.194-1.818,4.874,4.874,0,0,0-.648-.576a5.669,5.669,0,0,0,3.708-1.1A3.515,3.515,0,0,0,4.392-4.518a3.713,3.713,0,0,0-1.3-2.9L-4.1-12.96a4.943,4.943,0,0,1-1.728-3.96,4.654,4.654,0,0,1,.774-2.592A5.451,5.451,0,0,1-2.9-21.4,7.124,7.124,0,0,1,.36-22.1a15.182,15.182,0,0,1,3.312.324H4.86l.072,3.924h-.4A2.815,2.815,0,0,0,3.492-20.2,4.712,4.712,0,0,0,.5-21.024a5.029,5.029,0,0,0-3.2.99,3.105,3.105,0,0,0-1.26,2.556,3.429,3.429,0,0,0,1.4,2.718L4.716-9.144A4.676,4.676,0,0,1,6.372-5.328a5.391,5.391,0,0,1-1.854,4.14A6.46,6.46,0,0,1,0,.5,14.784,14.784,0,0,1-3.528.072,6.291,6.291,0,0,1-6.228-1.188Z',
  G5: 'M.252.5A12.12,12.12,0,0,1-8.334-2.574a10.8,10.8,0,0,1-3.222-8.244,10.8,10.8,0,0,1,3.222-8.244A11.622,11.622,0,0,1-.018-22.1a16.407,16.407,0,0,1,8.658,2.16l.792,5.112H9.108a7.556,7.556,0,0,0-2.934-4.68A10.7,10.7,0,0,0,.018-21.024a8.351,8.351,0,0,0-6.48,2.754,10.689,10.689,0,0,0-2.5,7.47,10.641,10.641,0,0,0,2.52,7.47A8.969,8.969,0,0,0,.522-.576a10.562,10.562,0,0,0,7.65-3.132L8.208-8.5a1.177,1.177,0,0,0-.414-1.026A1.873,1.873,0,0,0,6.552-9.9h-.5v-.36h6.588v.36h-.5q-1.62,0-1.62,1.44v4.32A12.99,12.99,0,0,1,6.354-.882,12.961,12.961,0,0,1,.252.5Z',
  G6: 'M11.34-21.24H10.8a1.662,1.662,0,0,0-1.476.756,1.574,1.574,0,0,0-.252.756V-7.6A7.608,7.608,0,0,1,6.678-1.674,9.4,9.4,0,0,1,.108.5,9.517,9.517,0,0,1-6.48-1.656a7.523,7.523,0,0,1-2.412-5.9V-19.692a1.417,1.417,0,0,0-.5-1.1,1.773,1.773,0,0,0-1.224-.45h-.54v-.36h6.84v.36h-.54a1.773,1.773,0,0,0-1.224.45,1.417,1.417,0,0,0-.5,1.1v11.7A8.024,8.024,0,0,0-4.806-2.484,6.372,6.372,0,0,0,.234-.468a7.168,7.168,0,0,0,5.22-1.908A6.944,6.944,0,0,0,7.416-7.6v-12.1a1.539,1.539,0,0,0-.522-1.116,1.749,1.749,0,0,0-1.206-.432h-.54v-.36H11.34Z',
  G7: 'M12.15-21.24h-.288a2.7,2.7,0,0,0-1.548.522,4.184,4.184,0,0,0-1.3,1.566Q1.17-2.3.846-1.512A8.708,8.708,0,0,0,.2.5H-.126l-8.892-19.62q-1.044-2.124-2.772-2.124h-.288v-.36H-4.7v.36h-.288a1.172,1.172,0,0,0-1.026.486,1.581,1.581,0,0,0-.342.882,3.413,3.413,0,0,0,.108.828L.2-3.348,6.822-18.972A2.462,2.462,0,0,0,7-19.854a1.551,1.551,0,0,0-.36-.9,1.258,1.258,0,0,0-1.08-.486H5.31v-.36h6.84Z',
  G8: 'M11.412,0H10.08A6.6,6.6,0,0,1,4.788-2.052l-7.92-8.676,7.74-9.108a.787.787,0,0,0,.126-.954.984.984,0,0,0-.918-.45H3.492v-.36h7.344v.36h-.144a4.719,4.719,0,0,0-3.492,1.3L-.648-11.556,8.28-1.836A3.978,3.978,0,0,0,9.612-.72a4.59,4.59,0,0,0,1.8.36ZM-2.268-.36h.4V0h-7.38V-.36h.432A2.076,2.076,0,0,0-7.344-.936,1.945,1.945,0,0,0-6.7-2.3V-19.3a1.945,1.945,0,0,0-.648-1.368A2.076,2.076,0,0,0-8.82-21.24h-.432v-.36h7.38v.36H-2.3a2.069,2.069,0,0,0-1.8.936,1.713,1.713,0,0,0-.288.972V-2.268a1.74,1.74,0,0,0,.63,1.35A2.179,2.179,0,0,0-2.268-.36Z',
  G9: 'M11.7,0H3.168V-.36H3.6A1.209,1.209,0,0,0,4.662-.846,1.519,1.519,0,0,0,5-1.638a1.3,1.3,0,0,0-.18-.63L-.144-9.4-5.4-2.3a1.054,1.054,0,0,0-.252.648,1.527,1.527,0,0,0,.342.81,1.249,1.249,0,0,0,1.1.486h.432V0h-7.848V-.36h.468A4.367,4.367,0,0,0-7.74-2.124l6.7-8.568L-7.128-19.44a4.373,4.373,0,0,0-1.494-1.278,4.039,4.039,0,0,0-1.962-.522h-.468v-.36h8.46v.36h-.432a1.209,1.209,0,0,0-1.062.486,1.519,1.519,0,0,0-.342.792,1.138,1.138,0,0,0,.216.63L.36-12.78l4.356-6.552a1,1,0,0,0,.216-.612,1.527,1.527,0,0,0-.342-.81,1.209,1.209,0,0,0-1.062-.486H3.1v-.36h7.992v.36h-.5a3.841,3.841,0,0,0-1.926.522A5.081,5.081,0,0,0,7.128-19.4l-5.8,8.064L7.776-2.124A3.97,3.97,0,0,0,9.558-.72a5.073,5.073,0,0,0,1.674.36H11.7Z',
  G10: 'M-7.164-.36A2.05,2.05,0,0,0-5.706-.918a1.911,1.911,0,0,0,.63-1.35V-19.3a1.919,1.919,0,0,0-.666-1.368,2.14,2.14,0,0,0-1.494-.576h-.432v-.36H-.216v.36H-.648a2.14,2.14,0,0,0-1.494.576,1.794,1.794,0,0,0-.63,1.368v18.18H2.844a6.23,6.23,0,0,0,2.808-.576A4.826,4.826,0,0,0,7.4-3.06a10.874,10.874,0,0,0,1.17-2.088h.36L6.948,0H-7.668V-.36Z',
  G11: 'M11.7-21.24h-.432a3.586,3.586,0,0,0-1.854.522A4.8,4.8,0,0,0,7.956-19.4L1.044-8.928V-2.3A1.816,1.816,0,0,0,1.656-.936,2.076,2.076,0,0,0,3.132-.36h.432V0h-7.38V-.36h.432A2.076,2.076,0,0,0-1.908-.936,1.816,1.816,0,0,0-1.3-2.3v-6.66L-7.956-19.44a3.812,3.812,0,0,0-3.312-1.8H-11.7v-.36h8.352v.36H-3.78a1.129,1.129,0,0,0-.99.432,1.363,1.363,0,0,0-.306.738A2.028,2.028,0,0,0-5-19.512L.252-10.188l5.58-9.288a1.678,1.678,0,0,0,.108-.594,1.363,1.363,0,0,0-.306-.738,1.17,1.17,0,0,0-1.026-.432H4.176v-.36H11.7Z',
  G12: 'M-8.208-18.72v.576h-.4v-4.068a6.692,6.692,0,0,0,1.71.378q1.242.162,2.322.2h8.28A21.93,21.93,0,0,0,6.12-21.78,6.168,6.168,0,0,0,7.776-22.1v.324L-5.9-1.08H3.96a6.745,6.745,0,0,0,2.808-.594,4.672,4.672,0,0,0,1.746-1.35,10.578,10.578,0,0,0,1.17-2.124h.36L8.1,0H-9.144V-.324L4.284-20.556H-6.444a1.681,1.681,0,0,0-1.548.936A1.988,1.988,0,0,0-8.208-18.72Z',
} as const

type GlyphKey = keyof typeof GLYPHS

const BG_GRID: Array<[GlyphKey, Array<[number, number]>]> = [
  ['A', [[688,306],[843,429],[781,756],[688,633],[688,511],[595,429],[564,553],[626,553]]],
  ['N', [[657,306],[843,512],[905,635],[657,717],[812,676],[906,347],[564,593]]],
  ['G1', [[719,306],[564,470],[843,267],[843,347],[595,675],[904,553],[936,429],[657,757],[781,635],[657,593],[812,512]]],
  ['O', [[812,266],[657,511],[874,388],[874,757],[657,675],[595,388]]],
  ['C', [[812,306],[843,388],[719,675],[719,756],[935,511],[657,429],[781,553]]],
  ['G2', [[626,306],[781,389],[750,675],[626,757],[936,553],[564,429],[874,347],[843,470],[626,593]]],
  ['D', [[656,266],[874,469],[626,635],[812,716],[905,757],[626,429],[843,553]]],
  ['E', [[688,266],[812,389],[718,634],[874,676],[843,757],[595,716],[905,429],[626,470]]],
  ['R', [[936,266],[904,389],[750,553],[688,717],[936,676]]],
  ['G3', [[720,266],[688,388],[719,512],[843,717],[905,512],[595,635],[688,554],[564,675]]],
  ['G4', [[595,266],[750,388],[719,716],[874,634],[874,430],[936,347],[564,511],[813,553]]],
  ['G5', [[750,266],[813,429],[812,635],[595,757],[936,716],[626,511],[595,347],[688,593]]],
  ['T', [[750,306],[719,347],[564,635],[843,677],[719,554],[812,470]]],
  ['H', [[781,266],[688,429],[782,676],[812,757],[936,389],[657,635],[564,307],[905,470],[688,675],[936,635],[719,388],[595,593],[782,512]]],
  ['G6', [[781,306],[781,430],[750,635],[905,717],[626,675],[750,512],[657,554]]],
  ['I', [[595,307],[657,388],[936,470],[874,553],[688,757],[905,676],[750,347]]],
  ['G7', [[626,267],[781,347],[626,390],[873,511],[750,757],[874,717],[719,429],[595,470],[937,593],[595,553]]],
  ['G8', [[875,266],[935,757],[626,716],[843,635],[750,429],[594,511],[563,388],[781,716]]],
  ['G9', [[875,306],[564,347],[750,593],[564,716]]],
  ['G10', [[906,266],[657,470],[843,307],[717,593]]],
  ['G11', [[906,306],[564,266]]],
  ['G12', [[936,306],[564,757],[750,717],[812,347]]],
]

const LOGO_MAIN_D = 'M-150.488,0.764Q-158.903,0.715 -163.764,-3.905A16.572,16.572 0 0,1 -168.631,-16.527A16.572,16.572 0 0,1 -163.764,-29.15Q-158.903,-33.764 -150.488,-33.764A27.844,27.844 0 0,1 -143.613,-32.884A21.794,21.794 0 0,1 -137.618,-30.464L-136.407,-22.654H-136.903Q-139.268,-32.12 -150.542,-32.12A13.269,13.269 0 0,0 -160.882,-27.94A16.384,16.384 0 0,0 -164.681,-16.5A18.549,18.549 0 0,0 -162.972,-8.277A12.545,12.545 0 0,0 -158.023,-2.86A14.488,14.488 0 0,0 -150.488,-0.935A20.055,20.055 0 0,0 -142.986,-2.227A11.917,11.917 0 0,0 -137.639,-6.49A13.923,13.923 0 0,0 -135.246,-13.86H-134.751L-135.363,-6.325A14.474,14.474 0 0,1 -141.577,-1.131A20.824,20.824 0 0,1 -150.488,0.764ZM-121.295,-31.57A19.916,19.916 0 0,1 -111.976,-33.77A20.122,20.122 0 0,1 -102.656,-31.598A16.99,16.99 0 0,1 -95.919,-25.465A16.427,16.427 0 0,1 -93.41,-16.5A16.427,16.427 0 0,1 -95.912,-7.535A16.99,16.99 0 0,1 -102.65,-1.402A18.83,18.83 0 0,1 -111.34,0.764A22.542,22.542 0 0,1 -119.205,-0.495A18.162,18.162 0 0,1 -125.118,-4.009A16.274,16.274 0 0,1 -129.077,-9.509A18.454,18.454 0 0,1 -130.535,-17.126A15.356,15.356 0 0,1 -128.032,-25.459A16.792,16.792 0 0,1 -121.295,-31.57ZM-122.34,-5.225A13.774,13.774 0 0,0 -112,-0.88A13.732,13.732 0 0,0 -101.66,-5.252A15.609,15.609 0 0,0 -97.486,-16.5A15.609,15.609 0 0,0 -101.666,-27.747A13.732,13.732 0 0,0 -112,-32.12A13.645,13.645 0 0,0 -122.312,-27.747A15.667,15.667 0 0,0 -126.465,-16.5A15.826,15.826 0 0,0 -122.34,-5.225ZM-76.933,-31.295H-79.847V-3.514A2.949,2.949 0 0,0 -78.308,-0.935A3.309,3.309 0 0,0 -76.713,-0.55H-75.998L-75.942,0H-87.218V-0.55H-86.454A3.056,3.056 0 0,0 -84.275,-1.402A2.727,2.727 0 0,0 -83.367,-3.465V-29.59A2.642,2.642 0 0,0 -84.275,-31.625A3.118,3.118 0 0,0 -86.444,-32.45H-87.208V-33H-73.412A12.846,12.846 0 0,1 -65.245,-30.635A7.535,7.535 0 0,1 -62.248,-24.42A9.054,9.054 0 0,1 -64.668,-17.985A9.472,9.472 0 0,1 -70.828,-15.015A12.43,12.43 0 0,1 -66.593,-10.725Q-66.647,-10.725 -64.695,-8.305T-61.56,-4.537Q-60.377,-3.19 -59.608,-2.475A6.608,6.608 0 0,0 -54.933,-0.55V0H-56.638A11.877,11.877 0 0,1 -63.457,-1.705A16.121,16.121 0 0,1 -66.868,-4.84Q-67.194,-5.28 -69.639,-8.717T-72.257,-12.375Q-75.228,-16.06 -77.812,-16.06V-16.61Q-71.377,-16.61 -70.058,-17.27A6.218,6.218 0 0,0 -67.582,-19.256A8.953,8.953 0 0,0 -66.207,-24.096A6.661,6.661 0 0,0 -68.194,-29.266A8.218,8.218 0 0,0 -73.529,-31.252Q-75.007,-31.295 -76.933,-31.295ZM-15.85,-16.5A15.687,15.687 0 0,1 -20.608,-4.431A18.181,18.181 0 0,1 -33.505,0H-51.875V-0.55H-51.16A2.985,2.985 0 0,0 -48.96,-1.43A3.056,3.056 0 0,0 -48.025,-3.514V-29.486A2.939,2.939 0 0,0 -48.987,-31.625A3.19,3.19 0 0,0 -51.215,-32.45H-51.875V-33H-33.505A20.851,20.851 0 0,1 -24.128,-31.014A14.14,14.14 0 0,1 -17.995,-25.294A17.386,17.386 0 0,1 -15.85,-16.5ZM-44.45,-31.35V-1.65H-33.505A12.962,12.962 0 0,0 -23.495,-5.637A15.382,15.382 0 0,0 -19.81,-16.5A15.382,15.382 0 0,0 -23.495,-27.362A12.962,12.962 0 0,0 -33.505,-31.35ZM34.1,-33V-32.45H33.66A3.667,3.667 0 0,0 31.46,-31.653A6.264,6.264 0 0,0 29.703,-29.26L19.525,0.764H18.975L11.275,-20.075L3.575,0.764H3.025L-7.562,-29.26A5.806,5.806 0 0,0 -9.274,-31.652A3.514,3.514 0 0,0 -11.489,-32.45H-11.917V-33H-2.017V-32.45H-2.457A1.757,1.757 0 0,0 -3.954,-31.707A2.368,2.368 0 0,0 -4.443,-30.36A5.194,5.194 0 0,0 -4.259,-29.095L4.4,-5.225L10.725,-22.55L9.35,-26.345A4.889,4.889 0 0,0 7.899,-28.6A3.208,3.208 0 0,0 5.836,-29.342H5.408V-29.892H15.308V-29.342H14.85A1.757,1.757 0 0,0 13.353,-28.6A2.368,2.368 0 0,0 12.864,-27.252A5.194,5.194 0 0,0 13.047,-25.987L20.075,-5.225L28.05,-28.985A3.819,3.819 0 0,0 28.325,-30.333A2.368,2.368 0 0,0 27.775,-31.707A1.91,1.91 0 0,0 26.125,-32.45H25.697V-33ZM72.067,-0.55H72.507V0H61.233V-0.55H61.672A1.89,1.89 0 0,0 63.267,-1.265A2.255,2.255 0 0,0 63.817,-2.612A3.595,3.595 0 0,0 63.597,-3.85L60.569,-11.165H46.657L43.633,-4.015A3.761,3.761 0 0,0 43.358,-2.667A2.37,2.37 0 0,0 43.907,-1.292A1.922,1.922 0 0,0 45.558,-0.55H45.998V0H35.493V-0.55H35.933A4.169,4.169 0 0,0 38.264,-1.347A5.873,5.873 0 0,0 40.222,-3.74Q52.267,-29.486 52.763,-30.69A13.304,13.304 0 0,0 53.752,-33.764H54.248L67.832,-3.74A4.783,4.783 0 0,0 72.067,-0.55ZM47.373,-12.815H59.913L53.752,-27.885ZM79.555,-0.55A4.013,4.013 0 0,0 82.14,-1.43A2.611,2.611 0 0,0 83.24,-3.514V-29.486A2.611,2.611 0 0,0 82.14,-31.576A4.094,4.094 0 0,0 79.5,-32.45H78.785V-33H91.215V-32.45H90.5A4.072,4.072 0 0,0 87.942,-31.625A2.826,2.826 0 0,0 86.76,-29.59V-3.465A2.703,2.703 0 0,0 87.915,-1.402A4.097,4.097 0 0,0 90.5,-0.55H91.215L91.264,0H78.785V-0.55ZM135.562,-32.45A3.008,3.008 0 0,0 133.472,-31.652A2.719,2.719 0 0,0 132.537,-29.7V-6.264A45.375,45.375 0 0,0 132.923,-0.214L133.032,0.764H132.537L103.938,-26.345V-3.41A2.678,2.678 0 0,0 104.817,-1.375A3.02,3.02 0 0,0 106.956,-0.55H107.891V0H97.502V-0.55H98.438A3.02,3.02 0 0,0 100.576,-1.375A2.678,2.678 0 0,0 101.456,-3.41V-26.95A41.876,41.876 0 0,0 101.071,-32.945L100.961,-33.825L101.573,-33.77L130.118,-6.875V-29.7A2.93,2.93 0 0,0 129.127,-31.652A3.008,3.008 0 0,0 127.037,-32.45H126.102V-33H136.491V-32.45ZM141.78,-0.55A3.132,3.132 0 0,0 144.007,-1.402A2.92,2.92 0 0,0 144.97,-3.465V-29.59A2.608,2.608 0 0,0 144.035,-31.625A3.291,3.291 0 0,0 141.78,-32.45H141.016V-33H157.07A21.037,21.037 0 0,0 161.03,-33.33A12.833,12.833 0 0,0 163.23,-33.88V-27.616L162.619,-27.671V-28.496A2.8,2.8 0 0,0 161.855,-30.482A2.587,2.587 0 0,0 159.869,-31.307H148.435V-17.337H157.84A2.11,2.11 0 0,0 159.521,-17.997A2.415,2.415 0 0,0 160.098,-19.647V-20.362H160.709V-12.662H160.098V-13.377A2.093,2.093 0 0,0 158.943,-15.467A3.868,3.868 0 0,0 158.008,-15.687H148.435V-1.717H157.07A9.342,9.342 0 0,0 161.333,-2.597A7.42,7.42 0 0,0 163.972,-4.675A18.666,18.666 0 0,0 165.815,-7.865H166.365L163.34,0H141.01V-0.55Z'
const LOGO_TAIL_D = 'M145.285,197.09c-6.789-4.327-9.8-10.23-11.545-23.39-2.16-.315-1.1,5.035-.973,8.724a14.729,14.729,0,0,0-3.515.341,1.281,1.281,0,0,0-.838.755,1.914,1.914,0,0,0-.59-.221.7.7,0,0,0-.675.243,1.259,1.259,0,0,0,.2,1.458,1.751,1.751,0,0,0,.653.437,3.411,3.411,0,0,0,.259,1.516c1.907,2.743,7.2,6.763,11.6,9.679q.362.247.737.484l.02.013h0c14.744,9.281,44.824,6.772,50.473-5.867-5.953,9.543-29.846,13.805-45.8,5.829'
const LOGO_THE_D = 'M-5.525-9.23a.753.753,0,0,0,.312-.962H-8.047l.754-2.548a.874.874,0,0,0-.988-.156l-1.456,2.574-2.08.364a.652.652,0,0,0-.286.728h2.028L-12.6-1.82a5,5,0,0,0-.364,1.482.777.777,0,0,0,.7.7c1.092,0,3.536-1.586,4.992-3.744.052-.312-.1-.468-.364-.468a9.519,9.519,0,0,1-2.964,2.34c-.208,0-.338-.156-.182-.65L-8.359-9.23Zm7.2-9.36a14.242,14.242,0,0,0-3.042.6.253.253,0,0,0-.078.338l.546.364c.416.286.286.65-.286,2.366L-6.123-.312c-.208.6.468.676.754.676A.476.476,0,0,0-4.9.052,42.115,42.115,0,0,1-1.755-5.356a16.414,16.414,0,0,1,3.3-3.458,2.828,2.828,0,0,1,1.4-.7c.364,0,.546.286.546.78A26.721,26.721,0,0,1,1.625-2.028c-.39.91-.65,1.3-1.04,1.3a1.5,1.5,0,0,1-.676-.338.62.62,0,0,0-.364-.156.825.825,0,0,0-.7.832c0,.208.1.754.962.754A2.858,2.858,0,0,0,1.7-.65a9.125,9.125,0,0,0,1.69-2.132A14.924,14.924,0,0,0,5.421-8.866c0-.91-.416-1.742-1.56-1.742a4.455,4.455,0,0,0-2.47,1.014A16.493,16.493,0,0,0-2.717-5.3l-.052-.052L-.091-13.13l1.872-5.3Zm11.83,7.982a4.991,4.991,0,0,0-3.12,1.248A9.772,9.772,0,0,0,6.513-2.366c0,1.274.546,2.73,2.106,2.73,1.092,0,2.574-.416,4.16-2.366a.349.349,0,0,0-.338-.442C11.3-1.456,10.647-.936,9.711-.936A1.333,1.333,0,0,1,8.463-2.418a6.544,6.544,0,0,1,.364-2.314c3.744-1.04,6.318-2.34,6.318-4.316A1.63,1.63,0,0,0,13.507-10.608Zm-.52.806a.555.555,0,0,1,.6.6,2.935,2.935,0,0,1-1.014,1.768A7.555,7.555,0,0,1,9.087-5.512a10.348,10.348,0,0,1,1.924-3.042C11.947-9.568,12.623-9.8,12.987-9.8Z'

// Exact GSAP easing curves used by The Quiet Table
const EASES = {
  power1InOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  power2Out: (t: number) => 1 - (1 - t) * (1 - t),
  power2In: (t: number) => t * t,
  power2InOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  power3Out: (t: number) => 1 - Math.pow(1 - t, 3),
  power3InOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expoOut: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t: number) =>
    t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2,
  sineOut: (t: number) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut2: (t: number) => {
    const c1 = 2
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpInkColor(t: number): string {
  // #d5c5ab (213, 197, 171) -> #f4e7cf (244, 231, 207)
  const r = Math.round(lerp(213, 244, t))
  const g = Math.round(lerp(197, 231, t))
  const b = Math.round(lerp(171, 207, t))
  return `rgb(${r}, ${g}, ${b})`
}

type Box = { x: number; y: number; w: number; h: number; cx: number; cy: number }

interface GlyphNode extends SVGGElement {
  _ox?: number
  _oy?: number
  _dist?: number
  _dir?: { x: number; y: number }
}

interface RuleNode extends SVGPathElement {
  _pivotX?: number
  _pivotY?: number
  _baseTransform?: string
}

interface PreparedStage {
  allGlyphs: GlyphNode[]
  wordGlyphs: GlyphNode[]
  otherGlyphs: GlyphNode[]
  homes: Box[]
  flights: Array<{ x: number; y: number; scale: number } | null>
  logoLetters: SVGPathElement[]
  tail: SVGGElement
  rules: RuleNode[]
  glint: SVGRectElement
  lb: DOMRect
  toStage: (el: SVGGraphicsElement) => DOMMatrix
  stageToLocal: (el: SVGGraphicsElement, x: number, y: number) => DOMPoint
}

function splitSubpaths(d: string): string[] {
  const tokens = d.match(/[a-df-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []
  const counts: Record<string, number> = {
    m: 2,
    l: 2,
    h: 1,
    v: 1,
    c: 6,
    s: 4,
    q: 4,
    t: 2,
    a: 7,
    z: 0,
  }
  const subs: string[][] = []
  let i = 0
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let cur: string[] | null = null
  let cmd = 'M'

  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++]
    const lc = cmd.toLowerCase()
    const rel = cmd === lc
    const n = counts[lc]

    if (lc === 'z') {
      if (cur) cur.push('Z')
      cx = sx
      cy = sy
      continue
    }

    const p = tokens.slice(i, i + n).map(Number)
    i += n

    if (lc === 'm') {
      const x = rel ? cx + p[0] : p[0]
      const y = rel ? cy + p[1] : p[1]
      cur = [`M${x} ${y}`]
      subs.push(cur)
      cx = sx = x
      cy = sy = y
      cmd = rel ? 'l' : 'L'
      continue
    }

    if (cur) cur.push(cmd + p.join(' '))
    if (lc === 'h') cx = rel ? cx + p[0] : p[0]
    else if (lc === 'v') cy = rel ? cy + p[0] : p[0]
    else {
      cx = rel ? cx + p[n - 2] : p[n - 2]
      cy = rel ? cy + p[n - 1] : p[n - 1]
    }
  }
  return subs.map((s) => s.join(''))
}

export function WelcomePage({
  onStart,
  onOpenMaterials,
  onOpenStyles,
  onOpenCalc,
  lang,
  setLang,
}: WelcomePageProps) {
  const [loaderProgress, setLoaderProgress] = useState(0)
  const [loaderDone, setLoaderDone] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)
  const [stageReady, setStageReady] = useState(false)

  const heroRef = useRef<HTMLElement | null>(null)
  const stageWrapRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const logoSourceRef = useRef<SVGSVGElement | null>(null)
  const bottomNavRef = useRef<HTMLElement | null>(null)

  const stageRef = useRef<PreparedStage | null>(null)
  const rafRef = useRef<number | null>(null)
  const animStateRef = useRef<{
    mode: 'playing' | 'skipping' | 'done'
    startTime: number
    currentTime: number
    skipStartTime: number
    skipFromTime: number
    renderAtTime: ((t: number) => void) | null
  }>({
    mode: 'playing',
    startTime: 0,
    currentTime: 0,
    skipStartTime: 0,
    skipFromTime: 0,
    renderAtTime: null,
  })

  // Set Telegram WebApp header & background to The Quiet Table deep espresso (#191714)
  useEffect(() => {
    try {
      window.Telegram?.WebApp?.setHeaderColor?.('#191714')
      window.Telegram?.WebApp?.setBackgroundColor?.('#191714')
    } catch {}
  }, [])

  // Restore or initialize saved language
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang: Lang = supportedLangs.includes(sysLang as Lang)
        ? (sysLang as Lang)
        : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }
    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  const buildAndPlayTimeline = useCallback(() => {
    const S = stageRef.current
    const svg = svgRef.current
    const stageWrap = stageWrapRef.current
    const hero = heroRef.current
    const bottomNav = bottomNavRef.current
    if (!S || !svg || !stageWrap || !hero || !bottomNav) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const {
      allGlyphs,
      wordGlyphs,
      otherGlyphs,
      homes,
      flights,
      logoLetters,
      tail,
      rules,
      glint,
      lb,
      stageToLocal,
    } = S

    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const shuffled = <T,>(arr: T[]): T[] => {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
      }
      return a
    }

    const scrambleOffsets = () => {
      const order = shuffled(allGlyphs.map((_, i) => i))
      return allGlyphs.map((g, i) => {
        const from = homes[i]
        const to = homes[order[i]]
        const a = stageToLocal(g, from.cx, from.cy)
        const b = stageToLocal(g, to.cx, to.cy)
        return { x: b.x - a.x, y: b.y - a.y }
      })
    }

    const startOff = scrambleOffsets()
    const hop1Off = scrambleOffsets()
    const hop2Off = scrambleOffsets()
    const startRot = allGlyphs.map(() => rand(-25, 25))
    const popStagger = allGlyphs.map(() => Math.random() * 0.9)
    const hop1Stagger = allGlyphs.map(() => Math.random() * 0.3)
    const hop2Stagger = allGlyphs.map(() => Math.random() * 0.3)
    const resOtherStagger = otherGlyphs.map(() => Math.random() * 0.45)
    const resWordStagger = wordGlyphs.map(() => Math.random() * (0.45 * 0.6))
    const flyRot = wordGlyphs.map(() => rand(-10, 10))

    const TOTAL_DURATION = 11.75

    const renderAtTime = (t: number) => {
      allGlyphs.forEach((g, i) => {
        const isWord = i < wordGlyphs.length
        const k = isWord ? i : i - wordGlyphs.length

        let x = startOff[i].x
        let y = startOff[i].y
        let sc = 0.4
        let rot = startRot[i]
        let op = 0

        // 1. Pop in, jumbled
        const tPop = clamp01((t - (0.05 + popStagger[i])) / 0.7)
        if (tPop > 0) {
          const e = EASES.backOut2(tPop)
          sc = lerp(0.4, 1, e)
          rot = lerp(startRot[i], 0, e)
          op = clamp01(tPop * 2.5)
        }

        // 2. Shuffle hop 1
        const tH1 = clamp01((t - (1.55 + hop1Stagger[i])) / 0.65)
        if (tH1 > 0) {
          const e = EASES.power3InOut(tH1)
          x = lerp(startOff[i].x, hop1Off[i].x, e)
          y = lerp(startOff[i].y, hop1Off[i].y, e)
        }

        // 3. Shuffle hop 2
        const tH2 = clamp01((t - (2.62 + hop2Stagger[i])) / 0.65)
        if (tH2 > 0) {
          const e = EASES.power3InOut(tH2)
          x = lerp(hop1Off[i].x, hop2Off[i].x, e)
          y = lerp(hop1Off[i].y, hop2Off[i].y, e)
        }

        // 4. Resolve into the 13x13 grid
        const rStart = isWord ? 3.92 + resWordStagger[k] : 3.67 + resOtherStagger[k]
        const tRes = clamp01((t - rStart) / 1.1)
        if (tRes > 0) {
          const e = EASES.expoInOut(tRes)
          x = lerp(hop2Off[i].x, 0, e)
          y = lerp(hop2Off[i].y, 0, e)
        }

        // 5. Spell THE / CORD / WAINE
        if (!isWord) {
          const tDim = clamp01((t - 5.54) / 0.9)
          if (tDim > 0) {
            op = lerp(1, 0.16, EASES.power2Out(tDim))
          }
          // 6. Disperse ripple outward
          const dist = g._dist ?? 0.5
          const dir = g._dir ?? { x: 0, y: 1 }
          const dStart = 7.26 + dist * 0.9
          const tDisp = clamp01((t - dStart) / 0.9)
          if (tDisp > 0) {
            const e = EASES.power2In(tDisp)
            op = lerp(0.16, 0, e)
            sc = lerp(1, 0.5, e)
            x = lerp(0, dir.x * 14, e)
            y = lerp(0, dir.y * 14 + 6, e)
          }
        } else {
          const sStart = 5.54 + k * 0.075
          const tFill = clamp01((t - sStart) / 0.4)
          const pathEl = g.firstElementChild as SVGPathElement | null
          if (pathEl) {
            pathEl.setAttribute('fill', lerpInkColor(EASES.power2Out(tFill)))
          }

          if (t > sStart && t < sStart + 0.58) {
            const dt = t - sStart
            if (dt <= 0.18) sc = lerp(1, 1.16, EASES.power2Out(dt / 0.18))
            else sc = lerp(1.16, 1, EASES.power2InOut((dt - 0.18) / 0.4))
          }

          // 6. Fly along 2-axis curved arcs into the logo
          const fStart = 7.755 + k * 0.035
          const tFly = clamp01((t - fStart) / 1.55)
          if (tFly > 0) {
            const f = flights[k]
            if (f) {
              x = lerp(0, f.x, EASES.expoInOut(tFly))
              y = lerp(0, f.y, EASES.power3InOut(tFly))
              sc = lerp(1, f.scale, EASES.expoInOut(tFly))
              if (tFly <= 0.5) rot = lerp(0, flyRot[k], EASES.sineOut(tFly * 2))
              else rot = lerp(flyRot[k], 0, EASES.sineInOut((tFly - 0.5) * 2))
            } else {
              op = lerp(1, 0, clamp01((t - fStart) / 0.4))
            }
          }

          // 7. Hand off to final logo letterforms
          const mStart = 8.955 + k * 0.035
          const tMorph = clamp01((t - mStart) / 0.6)
          if (tMorph > 0) {
            op = lerp(1, 0, EASES.power1InOut(tMorph))
          }
        }

        const ox = g._ox ?? 0
        const oy = g._oy ?? 0
        g.setAttribute(
          'transform',
          `translate(${x}, ${y}) translate(${ox}, ${oy}) rotate(${rot}) scale(${sc}) translate(${-ox}, ${-oy})`
        )
        g.style.opacity = String(op)
      })

      // Logo letters fade in
      logoLetters.forEach((el, k) => {
        const mStart = 8.955 + k * 0.035
        const tMorph = clamp01((t - mStart) / 0.6)
        el.style.opacity = String(EASES.power1InOut(tMorph))
      })

      // Rules grow outward from 'the'
      const tRules = clamp01((t - (8.955 + 0.25)) / 0.9)
      const eRules = EASES.expoOut(tRules)
      rules.forEach((r) => {
        const px = r._pivotX ?? 0
        const py = r._pivotY ?? 0
        const base = r._baseTransform ?? ''
        r.setAttribute(
          'transform',
          `${base} translate(${px}, ${py}) scale(${eRules}, 1) translate(${-px}, ${-py})`
        )
      })

      // Sweeping tail slides in
      const tTail = clamp01((t - (8.955 + 0.35)) / 0.9)
      const eTail = EASES.power3Out(tTail)
      tail.style.opacity = String(eTail)
      tail.setAttribute('transform', `translate(${lerp(-10, 0, eTail)}, 0)`)

      // 8. Settle: grow stage, bloom radial glow, sweep masked glint, reveal bottom UI
      const tSettle = clamp01((t - 9.255) / 2.2)
      const eSettle = EASES.expoInOut(tSettle)
      stageWrap.style.transform = `translateY(-22px) scale(${lerp(1, 1.18, eSettle)})`

      const tGlow = clamp01((t - 9.555) / 2.2)
      hero.style.setProperty('--glow', String(EASES.power2Out(tGlow)))

      const tGlint = clamp01((t - 9.655) / 1.4)
      glint.setAttribute(
        'x',
        String(lerp(lb.x - 60, lb.x + lb.width + 20, EASES.power2InOut(tGlint)))
      )

      const tCue = clamp01((t - 9.955) / 0.9)
      const eCue = EASES.power2Out(tCue)
      bottomNav.style.opacity = String(eCue)
      bottomNav.style.transform = `translate3d(0, ${lerp(12, 0, eCue)}px, 0)`
      bottomNav.style.pointerEvents = tCue > 0.5 ? 'auto' : 'none'
    }

    setIntroFinished(false)
    renderAtTime(0.001)
    setStageReady(true)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      renderAtTime(TOTAL_DURATION)
      setIntroFinished(true)
      return
    }

    const now = performance.now()
    animStateRef.current = {
      mode: 'playing',
      startTime: now,
      currentTime: 0,
      skipStartTime: 0,
      skipFromTime: 0,
      renderAtTime,
    }

    const tick = (ts: number) => {
      const st = animStateRef.current
      if (!st.renderAtTime) return

      if (st.mode === 'playing') {
        const elapsed = (ts - st.startTime) / 1000
        st.currentTime = elapsed
        if (elapsed >= TOTAL_DURATION) {
          st.renderAtTime(TOTAL_DURATION)
          st.mode = 'done'
          setIntroFinished(true)
          return
        }
        st.renderAtTime(elapsed)
        if (elapsed >= 9.95) {
          setIntroFinished(true)
        }
        rafRef.current = requestAnimationFrame(tick)
      } else if (st.mode === 'skipping') {
        const p = clamp01((ts - st.skipStartTime) / 800)
        const eased = EASES.power2InOut(p)
        const tCur = lerp(st.skipFromTime, TOTAL_DURATION, eased)
        st.currentTime = tCur
        st.renderAtTime(tCur)
        if (p >= 1) {
          st.mode = 'done'
          setIntroFinished(true)
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // Prepare SVG stage once after loader finishes (mirrors CodePen prepareStage)
  useEffect(() => {
    let cancelled = false
    const startMs = performance.now()
    const MIN_TIME = 900

    const loaderTick = (now: number) => {
      if (cancelled) return
      const elapsed = now - startMs
      const p = clamp01(elapsed / MIN_TIME)
      const eased = EASES.power2Out(p)
      setLoaderProgress(eased)
      if (p < 1) {
        requestAnimationFrame(loaderTick)
      } else {
        setTimeout(() => {
          if (cancelled) return
          setLoaderDone(true)
        }, 180)
      }
    }
    requestAnimationFrame(loaderTick)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaderDone || stageRef.current) return
    const svg = svgRef.current
    const logoSvg = logoSourceRef.current
    if (!svg || !logoSvg) return

    const NS = 'http://www.w3.org/2000/svg'
    const mk = (tag: string, attrs: Record<string, string | number> = {}) => {
      const el = document.createElementNS(NS, tag)
      for (const k in attrs) el.setAttribute(k, String(attrs[k]))
      return el
    }

    const toStage = (el: SVGGraphicsElement) => {
      const svgCtm = svg.getScreenCTM()
      const elCtm = el.getScreenCTM()
      if (!svgCtm || !elCtm) return new DOMMatrix()
      return svgCtm.inverse().multiply(elCtm)
    }

    const stageBox = (el: SVGGraphicsElement): Box => {
      const b = el.getBBox()
      const m = toStage(el)
      const pts = [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m))
      const xs = pts.map((p) => p.x)
      const ys = pts.map((p) => p.y)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      const w = Math.max(...xs) - x
      const h = Math.max(...ys) - y
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
    }

    const stageToLocal = (el: SVGGraphicsElement, x: number, y: number) => {
      return new DOMPoint(x, y).matrixTransform(toStage(el).inverse())
    }

    const explodeLetters = (path: SVGPathElement): SVGPathElement[] => {
      const parent = path.parentNode
      if (!parent) return []
      const attrs: Record<string, string> = {
        fill: path.getAttribute('fill') || '#d5c5ab',
      }
      const tr = path.getAttribute('transform')
      if (tr) attrs.transform = tr

      const pieces = splitSubpaths(path.getAttribute('d') || '').map((d) => {
        const el = mk('path', { ...attrs, d }) as SVGPathElement
        parent.insertBefore(el, path)
        return { d, el, box: stageBox(el) }
      })

      pieces.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)
      const letters: Array<{ d: string; el: SVGPathElement; box: Box }> = []
      for (const p of pieces) {
        const host = letters.find(
          (L) =>
            p.box.x >= L.box.x - 0.5 &&
            p.box.y >= L.box.y - 0.5 &&
            p.box.x + p.box.w <= L.box.x + L.box.w + 0.5 &&
            p.box.y + p.box.h <= L.box.y + L.box.h + 0.5
        )
        if (host) {
          host.d += p.d
          p.el.remove()
        } else {
          letters.push(p)
        }
      }
      letters.forEach((L) => {
        L.el.setAttribute('d', L.d)
        L.box = stageBox(L.el)
      })
      path.remove()

      letters.sort((a, b) => a.box.cy - b.box.cy)
      const rows: Array<{ cy: number; items: typeof letters }> = []
      letters.forEach((L) => {
        const row = rows.find((r) => Math.abs(r.cy - L.box.cy) < L.box.h * 0.6)
        if (row) row.items.push(L)
        else rows.push({ cy: L.box.cy, items: [L] })
      })
      return rows
        .flatMap((r) => r.items.sort((a, b) => a.box.x - b.box.x))
        .map((L) => L.el)
    }

    const vb = svg.viewBox.baseVal
    const grid = svg.querySelector('#grid') as SVGGElement
    const wrapAll = (paths: SVGPathElement[]): GlyphNode[] =>
      paths.map((p) => {
        const g = mk('g', { class: 'glyph' }) as GlyphNode
        p.parentNode?.insertBefore(g, p)
        g.appendChild(p)
        return g
      })

    const wordGlyphs = ['#the', '#cord', '#waine'].flatMap((sel) =>
      wrapAll(Array.from(grid.querySelectorAll(`${sel} path`)))
    )
    const otherGlyphs = wrapAll(
      Array.from(grid.querySelectorAll('#everything-else path'))
    )
    const allGlyphs = [...wordGlyphs, ...otherGlyphs]

    const lvb = logoSvg.viewBox.baseVal
    const scale = (vb.width * 0.9) / lvb.width
    const logoWrap = mk('g', {
      id: 'logo-wrap',
      transform: `translate(${(vb.width - lvb.width * scale) / 2} ${
        (vb.height - lvb.height * scale) / 2
      }) scale(${scale})`,
    })
    const logoInner = mk('svg', {
      x: 0,
      y: 0,
      width: lvb.width,
      height: lvb.height,
      viewBox: `0 0 ${lvb.width} ${lvb.height}`,
      overflow: 'visible',
    })
    Array.from(logoSvg.childNodes).forEach((n) => logoInner.appendChild(n))
    logoWrap.appendChild(logoInner)
    svg.appendChild(logoWrap)

    const logoG = logoInner.querySelector('g') as SVGGElement
    const parts = Array.from(logoG.children) as SVGPathElement[]
    const tailPath = parts[1]
    const tail = mk('g', { class: 'logo-tail' }) as SVGGElement
    tailPath.parentNode?.insertBefore(tail, tailPath)
    tail.appendChild(tailPath)

    const rules = [3, 4].map((i) => parts[i] as RuleNode).filter(Boolean)
    const small = explodeLetters(parts[2])
    const main = explodeLetters(parts[0])
    const logoLetters = [...small, ...main]

    const smallCx = small.length
      ? small.reduce((s, el) => s + stageBox(el).cx, 0) / small.length
      : 0
    rules.forEach((r) => {
      const rb = r.getBBox()
      const isLeft = stageBox(r).cx < smallCx
      r._pivotX = isLeft ? rb.x + rb.width : rb.x
      r._pivotY = rb.y + rb.height / 2
      r._baseTransform = r.getAttribute('transform') || ''
    })

    const lb = logoG.getBBox()
    const defs = mk('defs')
    const grad = mk('linearGradient', {
      id: 'qt-glint-grad',
      x1: 0,
      x2: 1,
      y1: 0,
      y2: 0,
    })
    ;(
      [
        [0, 0],
        [0.5, 0.9],
        [1, 0],
      ] as Array<[number, number]>
    ).forEach(([o, a]) =>
      grad.appendChild(
        mk('stop', { offset: o, 'stop-color': '#fff6e6', 'stop-opacity': a })
      )
    )
    const mask = mk('mask', {
      id: 'qt-logo-mask',
      maskUnits: 'userSpaceOnUse',
      x: lb.x - 50,
      y: lb.y - 50,
      width: lb.width + 100,
      height: lb.height + 100,
    })
    ;[...logoLetters, tail, ...rules].forEach((el, i) => {
      if (!el.id) el.id = `qt-logo-part-${i}`
      mask.appendChild(
        mk('use', { href: `#${el.id}`, fill: '#fff', style: 'fill:#fff' })
      )
    })
    defs.append(grad, mask)
    logoG.appendChild(defs)
    const glintGroup = mk('g', { mask: 'url(#qt-logo-mask)' })
    const glint = mk('rect', {
      x: lb.x - 60,
      y: lb.y - 20,
      width: 46,
      height: lb.height + 40,
      fill: 'url(#qt-glint-grad)',
    }) as SVGRectElement
    glintGroup.appendChild(glint)
    logoG.appendChild(glintGroup)

    const homes = allGlyphs.map((g) => stageBox(g))
    allGlyphs.forEach((g, i) => {
      const o = stageToLocal(g, homes[i].cx, homes[i].cy)
      g._ox = o.x
      g._oy = o.y
    })

    const flights = wordGlyphs.map((g, i) => {
      const target = logoLetters[i]
      if (!target) return null
      const from = homes[i]
      const to = stageBox(target)
      const a = stageToLocal(g, from.cx, from.cy)
      const b = stageToLocal(g, to.cx, to.cy)
      return {
        x: b.x - a.x,
        y: b.y - a.y,
        scale: Math.sqrt((to.w * to.h) / (from.w * from.h)),
      }
    })

    const wordsCenter = wordGlyphs.reduce(
      (acc, _, i) => ({
        x: acc.x + homes[i].cx / wordGlyphs.length,
        y: acc.y + homes[i].cy / wordGlyphs.length,
      }),
      { x: 0, y: 0 }
    )
    const maxDist = Math.max(
      ...homes.map((h) => Math.hypot(h.cx - wordsCenter.x, h.cy - wordsCenter.y))
    )
    otherGlyphs.forEach((g, k) => {
      const h = homes[wordGlyphs.length + k]
      g._dist = Math.hypot(h.cx - wordsCenter.x, h.cy - wordsCenter.y) / maxDist
      g._dir = {
        x: (h.cx - wordsCenter.x) / maxDist,
        y: (h.cy - wordsCenter.y) / maxDist,
      }
    })

    stageRef.current = {
      allGlyphs,
      wordGlyphs,
      otherGlyphs,
      homes,
      flights,
      logoLetters,
      tail,
      rules,
      glint,
      lb,
      toStage,
      stageToLocal,
    }

    buildAndPlayTimeline()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [loaderDone, buildAndPlayTimeline])

  const handleSkip = useCallback(() => {
    haptic('light')
    const st = animStateRef.current
    if (st.mode !== 'playing') return
    st.mode = 'skipping'
    st.skipStartTime = performance.now()
    st.skipFromTime = st.currentTime
  }, [])

  const handleReplay = useCallback(() => {
    haptic('light')
    buildAndPlayTimeline()
  }, [buildAndPlayTimeline])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSkip])

  const t = {
    ru: {
      ch1: 'Cardio',
      ch2: 'Силуэты',
      ch3: 'Расчёты',
      enter: 'Войти',
      skip: 'Skip intro',
      replay: 'Replay',
    },
    uk: {
      ch1: 'Cardio',
      ch2: 'Силуети',
      ch3: 'Розрахунки',
      enter: 'Увійти',
      skip: 'Skip intro',
      replay: 'Replay',
    },
    de: {
      ch1: 'Cardio',
      ch2: 'Silhouetten',
      ch3: 'Rechner',
      enter: 'Eintreten',
      skip: 'Skip intro',
      replay: 'Replay',
    },
  }[lang]

  const langList: Array<{ code: Lang; label: string }> = [
    { code: 'ru', label: 'ru' },
    { code: 'uk', label: 'ukr' },
    { code: 'de', label: 'de' },
  ]
  const activeLangIdx = Math.max(
    0,
    langList.findIndex((item) => item.code === lang)
  )

  return (
    <main
      ref={heroRef}
      style={
        {
          '--glow': 0,
          background:
            'radial-gradient(120% 90% at 50% 45%, transparent 35%, #100f0d 100%), #191714',
          color: '#d5c5ab',
          fontFamily: '"Cormorant Garamond", "Cormorant", "Playfair Display", Georgia, serif',
        } as React.CSSProperties
      }
      className="relative grid h-[100dvh] w-full place-items-center overflow-hidden select-none isolate antialiased"
    >
      {/* Load Google Font Cormorant Garamond for exact typographic parity */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap"
      />

      {/* 0. Loader */}
      <div
        aria-hidden={loaderDone}
        style={{
          background: '#191714',
          opacity: loaderDone ? 0 : 1,
          pointerEvents: loaderDone ? 'none' : 'auto',
          transition: 'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="fixed inset-0 z-50 grid place-items-center content-center gap-[18px]"
      >
        <div
          style={{ background: 'rgba(213, 197, 171, 0.14)' }}
          className="relative h-[1px] w-[160px] overflow-hidden"
        >
          <span
            style={{
              background: '#d5c5ab',
              transform: `scaleX(${loaderProgress})`,
              transformOrigin: 'left center',
            }}
            className="absolute inset-0"
          />
        </div>
        <span
          style={{ color: 'rgba(213, 197, 171, 0.45)' }}
          className="text-[13px] tracking-[0.3em] tabular-nums"
        >
          {Math.round(loaderProgress * 100)}
        </span>
      </div>

      {/* Soft radial glow behind the assembled logo */}
      <div
        aria-hidden="true"
        style={{
          width: '70vmin',
          height: '40vmin',
          background: 'radial-gradient(closest-side, rgba(244, 231, 207, 0.11), transparent)',
          opacity: 'var(--glow, 0)',
        }}
        className="pointer-events-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
      />

      {/* Fine film grain overlay */}
      <div
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        className="pointer-events-none absolute -inset-1/2 z-20 opacity-[0.07] mix-blend-overlay"
      />

      {/* 1. TOP BAR: Replay / Skip + Apple-style smooth pill language switcher (ru / ukr / de) */}
      <header className="absolute top-0 right-0 left-0 z-30 flex items-center justify-between px-6 pt-5">
        <div>
          {!introFinished ? (
            <button
              type="button"
              onClick={handleSkip}
              style={{ color: 'rgba(213, 197, 171, 0.45)' }}
              className="border-0 bg-transparent py-2 pr-3 text-[15px] font-medium italic tracking-[0.08em] outline-none transition-colors duration-300 hover:text-[#f4e7cf] cursor-pointer"
            >
              {t.skip}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReplay}
              style={{ color: 'rgba(213, 197, 171, 0.45)' }}
              className="inline-flex items-center gap-2 border-0 bg-transparent py-2 pr-3 text-[15px] font-medium italic tracking-[0.08em] outline-none transition-colors duration-300 hover:text-[#f4e7cf] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
              </svg>
              <span>{t.replay}</span>
            </button>
          )}
        </div>

        {/* Apple-style liquid glass segmented switcher: ru | ukr | de */}
        <div
          role="tablist"
          aria-label="Language switcher"
          style={{
            background: 'rgba(213, 197, 171, 0.055)',
            borderColor: 'rgba(213, 197, 171, 0.14)',
          }}
          className="relative grid grid-cols-3 items-center rounded-full border p-[3px] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
        >
          <span
            aria-hidden="true"
            style={{
              transform: `translate3d(${activeLangIdx * 100}%, 0, 0)`,
              background: 'rgba(244, 231, 207, 0.15)',
              boxShadow:
                '0 2px 8px rgba(0, 0, 0, 0.38), inset 0 1px 0.5px rgba(255, 255, 255, 0.16)',
              transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full"
          />
          {langList.map((item) => {
            const active = lang === item.code
            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  haptic('light')
                  localStorage.setItem('app_lang', item.code)
                  localStorage.setItem('cordwainer_lang', item.code)
                  setLang(item.code)
                }}
                style={{
                  color: active ? '#f4e7cf' : 'rgba(213, 197, 171, 0.45)',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
                  transition: 'color 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="relative z-10 min-w-[42px] rounded-full border-0 bg-transparent px-2.5 py-1 text-center text-[11px] font-medium lowercase tracking-[0.04em] outline-none cursor-pointer"
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* 2. HERO STAGE: 13x13 Vector Letter Grid & Assembled CORDWAINE Logo */}
      <div
        ref={stageWrapRef}
        style={{
          width: 'min(78vw, 55vh)',
          visibility: stageReady ? 'visible' : 'hidden',
          transform: 'translateY(-22px)',
          willChange: 'transform',
        }}
        className="relative z-10"
      >
        <svg
          ref={svgRef}
          id="letter-grid"
          xmlns="http://www.w3.org/2000/svg"
          width="397.912"
          height="513.68"
          viewBox="0 0 397.912 513.68"
          style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
        >
          <g id="grid" transform="translate(-551.238 -243.824)">
            <g id="the">
              <path id="the-t" d={GLYPHS.T} transform="translate(626 347)" fill="#d5c5ab" />
              <path id="the-h" d={GLYPHS.H} transform="translate(657 347)" fill="#d5c5ab" />
              <path id="the-e" d={GLYPHS.E} transform="translate(688 347)" fill="#d5c5ab" />
            </g>
            <g id="cord">
              <path id="cord-c" d={GLYPHS.C} transform="translate(688 470)" fill="#d5c5ab" />
              <path id="cord-o" d={GLYPHS.O} transform="translate(719 470)" fill="#d5c5ab" />
              <path id="cord-r" d={GLYPHS.R} transform="translate(750 470)" fill="#d5c5ab" />
              <path id="cord-d" d={GLYPHS.D} transform="translate(781 470)" fill="#d5c5ab" />
            </g>
            <g id="waine">
              <path id="waine-w" d={GLYPHS.W} transform="translate(781 593)" fill="#d5c5ab" />
              <path id="waine-a" d={GLYPHS.A} transform="translate(812 593)" fill="#d5c5ab" />
              <path id="waine-i" d={GLYPHS.I} transform="translate(843 593)" fill="#d5c5ab" />
              <path id="waine-n" d={GLYPHS.N} transform="translate(874 593)" fill="#d5c5ab" />
              <path id="waine-e" d={GLYPHS.E} transform="translate(905 593)" fill="#d5c5ab" />
            </g>
            <g id="everything-else">
              {BG_GRID.map(([glyphKey, coords]) =>
                coords.map(([x, y], idx) => (
                  <path
                    key={`${glyphKey}-${x}-${y}-${idx}`}
                    d={GLYPHS[glyphKey]}
                    transform={`translate(${x} ${y})`}
                    fill="#d5c5ab"
                  />
                ))
              )}
            </g>
          </g>
        </svg>
      </div>

      {/* Hidden source for the final logo; moved into stage on mount */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <svg
          ref={logoSourceRef}
          id="logo"
          xmlns="http://www.w3.org/2000/svg"
          width="328.46"
          height="67.425"
          viewBox="0 0 328.46 67.425"
        >
          <g transform="translate(-586.87 -85.41)">
            <path d={LOGO_MAIN_D} transform="translate(750 143)" fill="#d5c5ab" />
            <path d={LOGO_TAIL_D} transform="translate(468.5 -49.879)" fill="#d5c5ab" />
            <path d={LOGO_THE_D} transform="translate(650 104)" fill="#d5c5ab" />
            <path d="M77,.5H0v-1H77Z" transform="translate(667 104)" fill="#d5c5ab" />
            <path d="M11,.5H0v-1H11Z" transform="translate(623 104)" fill="#d5c5ab" />
          </g>
        </svg>
      </div>

      {/* 3. BOTTOM NAVIGATION: Pure typographic Cardio · Силуэты · Расчёты & Войти */}
      <footer
        ref={bottomNavRef}
        style={{
          opacity: 0,
          transform: 'translate3d(0, 12px, 0)',
          pointerEvents: 'none',
        }}
        className="absolute right-0 bottom-7 left-0 z-30 flex flex-col items-center gap-5 px-6"
      >
        <nav aria-label="Chapters" className="flex items-center gap-7">
          {[
            { label: t.ch1, onClick: onOpenMaterials },
            { label: t.ch2, onClick: onOpenStyles },
            { label: t.ch3, onClick: onOpenCalc },
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  style={{ color: 'rgba(213, 197, 171, 0.35)' }}
                  className="text-[12px]"
                >
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  item.onClick?.()
                }}
                style={{
                  color: '#d5c5ab',
                  transition:
                    'color 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="border-0 bg-transparent px-1 py-1 text-[17.5px] font-normal tracking-[0.05em] outline-none hover:text-[#f4e7cf] active:scale-95 cursor-pointer"
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Scroll-cue style primary entry button: Войти */}
        <button
          type="button"
          onClick={() => {
            haptic('medium')
            onStart?.()
          }}
          style={{
            color: '#f4e7cf',
            transition: 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1), color 300ms ease',
          }}
          className="group flex flex-col items-center gap-2.5 border-0 bg-transparent px-5 py-1 outline-none active:scale-95 cursor-pointer"
        >
          <span className="text-[13px] font-normal uppercase tracking-[0.35em]">
            {t.enter}
          </span>
          <i
            aria-hidden="true"
            style={{ background: 'rgba(213, 197, 171, 0.15)' }}
            className="relative block h-[38px] w-[1px] overflow-hidden"
          >
            <span
              style={{
                background: '#d5c5ab',
                animation: 'qtCue 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
              }}
              className="absolute top-0 left-0 block h-[40%] w-full"
            />
          </i>
        </button>
      </footer>

      <style>{`
        @keyframes qtCue {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(260%); }
        }
      `}</style>
    </main>
  )
}
