{
 "patcher": {
  "fileversion": 1,
  "appversion": {
   "major": 9,
   "minor": 0,
   "revision": 8,
   "architecture": "x64",
   "modernui": 1
  },
  "classnamespace": "box",
  "rect": [
   59.0,
   175.0,
   820.0,
   560.0
  ],
  "gridsize": [
   15.0,
   15.0
  ],
  "boxes": [
   {
    "box": {
     "id": "obj-1",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      50,
      30,
      30,
      22.0
     ],
     "text": "in 1",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-2",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 4,
     "patching_rect": [
      50,
      70,
      170,
      22.0
     ],
     "text": "unpack 0. 0. 0. 0.",
     "outlettype": [
      "float",
      "float",
      "float",
      "float"
     ]
    }
   },
   {
    "box": {
     "id": "pakF",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      50,
      110,
      60,
      22.0
     ],
     "text": "pak 0. 30",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "pakA",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      145,
      110,
      60,
      22.0
     ],
     "text": "pak 0. 30",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "pakASq",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      240,
      110,
      60,
      22.0
     ],
     "text": "pak 0. 30",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "pakP",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      335,
      110,
      68,
      22.0
     ],
     "text": "pak 0.5 30",
     "outlettype": [
      ""
     ]
    }
   },
   {
    "box": {
     "id": "obj-3",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      50,
      150,
      60,
      22.0
     ],
     "text": "line~ 100.",
     "outlettype": [
      "signal",
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-5",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      145,
      150,
      60,
      22.0
     ],
     "text": "line~ 0.",
     "outlettype": [
      "signal",
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-sqAmpLine",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      240,
      150,
      60,
      22.0
     ],
     "text": "line~ 0.",
     "outlettype": [
      "signal",
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-7",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      335,
      150,
      60,
      22.0
     ],
     "text": "line~ 0.5",
     "outlettype": [
      "signal",
      "bang"
     ]
    }
   },
   {
    "box": {
     "id": "obj-4",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      50,
      190,
      43,
      22.0
     ],
     "text": "cycle~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-rect",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      145,
      190,
      40,
      22.0
     ],
     "text": "rect~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-left_gain",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      335,
      190,
      40,
      22.0
     ],
     "text": "!-~ 1.",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-6",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      50,
      230,
      34,
      22.0
     ],
     "text": "*~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-sqMul",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      145,
      230,
      34,
      22.0
     ],
     "text": "*~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-sum",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      50,
      270,
      34,
      22.0
     ],
     "text": "+~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-att",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      50,
      310,
      54,
      22.0
     ],
     "text": "*~ 0.04",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-8",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      50,
      350,
      34,
      22.0
     ],
     "text": "*~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-9",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      145,
      350,
      34,
      22.0
     ],
     "text": "*~",
     "outlettype": [
      "signal"
     ]
    }
   },
   {
    "box": {
     "id": "obj-10",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      50,
      390,
      42,
      22.0
     ],
     "text": "out~ 1",
     "outlettype": []
    }
   },
   {
    "box": {
     "id": "obj-11",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      145,
      390,
      42,
      22.0
     ],
     "text": "out~ 2",
     "outlettype": []
    }
   }
  ],
  "lines": [
   {
    "patchline": {
     "destination": [
      "obj-2",
      0
     ],
     "source": [
      "obj-1",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "pakF",
      0
     ],
     "source": [
      "obj-2",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "pakA",
      0
     ],
     "source": [
      "obj-2",
      1
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "pakASq",
      0
     ],
     "source": [
      "obj-2",
      2
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "pakP",
      0
     ],
     "source": [
      "obj-2",
      3
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-3",
      0
     ],
     "source": [
      "pakF",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-5",
      0
     ],
     "source": [
      "pakA",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-sqAmpLine",
      0
     ],
     "source": [
      "pakASq",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-7",
      0
     ],
     "source": [
      "pakP",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-4",
      0
     ],
     "source": [
      "obj-3",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-rect",
      0
     ],
     "source": [
      "obj-3",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-6",
      0
     ],
     "source": [
      "obj-4",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-6",
      1
     ],
     "source": [
      "obj-5",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-sqMul",
      0
     ],
     "source": [
      "obj-rect",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-sqMul",
      1
     ],
     "source": [
      "obj-sqAmpLine",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-sum",
      0
     ],
     "source": [
      "obj-6",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-sum",
      1
     ],
     "source": [
      "obj-sqMul",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-att",
      0
     ],
     "source": [
      "obj-sum",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-8",
      0
     ],
     "source": [
      "obj-att",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-9",
      0
     ],
     "source": [
      "obj-att",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-9",
      1
     ],
     "source": [
      "obj-7",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-left_gain",
      0
     ],
     "source": [
      "obj-7",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-8",
      1
     ],
     "source": [
      "obj-left_gain",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-10",
      0
     ],
     "source": [
      "obj-8",
      0
     ]
    }
   },
   {
    "patchline": {
     "destination": [
      "obj-11",
      0
     ],
     "source": [
      "obj-9",
      0
     ]
    }
   }
  ],
  "dependency_cache": [],
  "autosave": 0
 }
}
