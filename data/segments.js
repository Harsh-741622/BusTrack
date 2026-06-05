(function () {
  window.BusTrackData = window.BusTrackData || {};

  // Canonical reusable corridor segments. Reverse traversal is represented in segmentAliases.

  window.BusTrackData.segments = [
  {
    segment_id: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    from_stop: "STOP_BARDOLI",
    to_stop: "STOP_BARDOLI_LINEAR",
    avg_time_min: 5,
    distance_km: 1.9,
    canonical: true,
    alias_segment_ids: [
      "SEG_BARDOLI_LINEAR_TO_BARDOLI"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
        from_stop: "STOP_BARDOLI",
        to_stop: "STOP_BARDOLI_LINEAR",
        avg_time_min: 5,
        distance_km: 1.9,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_BARDOLI_LINEAR_TO_BARDOLI",
        from_stop: "STOP_BARDOLI_LINEAR",
        to_stop: "STOP_BARDOLI",
        avg_time_min: 10,
        distance_km: 1.9,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_BARDOLI_LINEAR_TO_SARBHON",
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_SARBHON",
    avg_time_min: 15,
    distance_km: 7.8,
    canonical: true,
    alias_segment_ids: [
      "SEG_SARBHON_TO_BARDOLI_LINEAR"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_BARDOLI_LINEAR_TO_SARBHON",
        from_stop: "STOP_BARDOLI_LINEAR",
        to_stop: "STOP_SARBHON",
        avg_time_min: 15,
        distance_km: 7.8,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_SARBHON_TO_BARDOLI_LINEAR",
        from_stop: "STOP_SARBHON",
        to_stop: "STOP_BARDOLI_LINEAR",
        avg_time_min: 20,
        distance_km: 7.8,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_SARBHON_TO_NAVSARI",
    from_stop: "STOP_SARBHON",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 20,
    distance_km: 18.8,
    canonical: true,
    alias_segment_ids: [
      "SEG_NAVSARI_TO_SARBHON"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_SARBHON_TO_NAVSARI",
        from_stop: "STOP_SARBHON",
        to_stop: "STOP_NAVSARI",
        avg_time_min: 20,
        distance_km: 18.8,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_NAVSARI_TO_SARBHON",
        from_stop: "STOP_NAVSARI",
        to_stop: "STOP_SARBHON",
        avg_time_min: 30,
        distance_km: 18.8,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_SELAMBA_TO_DEDIAPADA",
    from_stop: "STOP_SELAMBA",
    to_stop: "STOP_DEDIAPADA",
    avg_time_min: 50,
    distance_km: 26.4,
    canonical: true,
    alias_segment_ids: [
      "SEG_DEDIAPADA_TO_SELAMBA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_SELAMBA_TO_DEDIAPADA",
        from_stop: "STOP_SELAMBA",
        to_stop: "STOP_DEDIAPADA",
        avg_time_min: 50,
        distance_km: 26.4,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_DEDIAPADA_TO_SELAMBA",
        from_stop: "STOP_DEDIAPADA",
        to_stop: "STOP_SELAMBA",
        avg_time_min: 45,
        distance_km: 26.4,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_DEDIAPADA_TO_MANDVI_SURAT",
    from_stop: "STOP_DEDIAPADA",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 120,
    distance_km: 50.7,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_DEDIAPADA_TO_MANDVI_SURAT",
        from_stop: "STOP_DEDIAPADA",
        to_stop: "STOP_MANDVI_SURAT",
        avg_time_min: 120,
        distance_km: 50.7,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_MANDVI_SURAT_TO_KADOD",
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_KADOD",
    avg_time_min: 30,
    distance_km: 9.6,
    canonical: true,
    alias_segment_ids: [
      "SEG_KADOD_TO_MANDVI_SURAT"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_MANDVI_SURAT_TO_KADOD",
        from_stop: "STOP_MANDVI_SURAT",
        to_stop: "STOP_KADOD",
        avg_time_min: 30,
        distance_km: 9.6,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_KADOD_TO_MANDVI_SURAT",
        from_stop: "STOP_KADOD",
        to_stop: "STOP_MANDVI_SURAT",
        avg_time_min: 25,
        distance_km: 9.6,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_KADOD_TO_BARDOLI",
    from_stop: "STOP_KADOD",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 30,
    distance_km: 14.8,
    canonical: true,
    alias_segment_ids: [
      "SEG_BARDOLI_TO_KADOD"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_KADOD_TO_BARDOLI",
        from_stop: "STOP_KADOD",
        to_stop: "STOP_BARDOLI",
        avg_time_min: 30,
        distance_km: 14.8,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_BARDOLI_TO_KADOD",
        from_stop: "STOP_BARDOLI",
        to_stop: "STOP_KADOD",
        avg_time_min: 20,
        distance_km: 14.8,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_BARDOLI_LINEAR_TO_MAHUVA_BARDOLI",
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_MAHUVA_BARDOLI",
    avg_time_min: 13,
    distance_km: 11.4,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_BARDOLI_LINEAR_TO_MAHUVA_BARDOLI",
        from_stop: "STOP_BARDOLI_LINEAR",
        to_stop: "STOP_MAHUVA_BARDOLI",
        avg_time_min: 13,
        distance_km: 11.4,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_MAHUVA_BARDOLI_TO_NAVSARI",
    from_stop: "STOP_MAHUVA_BARDOLI",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 45,
    distance_km: 22.6,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_MAHUVA_BARDOLI_TO_NAVSARI",
        from_stop: "STOP_MAHUVA_BARDOLI",
        to_stop: "STOP_NAVSARI",
        avg_time_min: 45,
        distance_km: 22.6,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_BARDOLI_LINEAR_TO_KADOD",
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_KADOD",
    avg_time_min: 25,
    distance_km: 16,
    canonical: true,
    alias_segment_ids: [
      "SEG_KADOD_TO_BARDOLI_LINEAR"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_BARDOLI_LINEAR_TO_KADOD",
        from_stop: "STOP_BARDOLI_LINEAR",
        to_stop: "STOP_KADOD",
        avg_time_min: 25,
        distance_km: 16,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_KADOD_TO_BARDOLI_LINEAR",
        from_stop: "STOP_KADOD",
        to_stop: "STOP_BARDOLI_LINEAR",
        avg_time_min: 30,
        distance_km: 16,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_MANDVI_SURAT_TO_NETRANG",
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_NETRANG",
    avg_time_min: 80,
    distance_km: 43.1,
    canonical: true,
    alias_segment_ids: [
      "SEG_NETRANG_TO_MANDVI_SURAT"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_MANDVI_SURAT_TO_NETRANG",
        from_stop: "STOP_MANDVI_SURAT",
        to_stop: "STOP_NETRANG",
        avg_time_min: 80,
        distance_km: 43.1,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_NETRANG_TO_MANDVI_SURAT",
        from_stop: "STOP_NETRANG",
        to_stop: "STOP_MANDVI_SURAT",
        avg_time_min: 90,
        distance_km: 43.1,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_NETRANG_TO_RAJPIPLA",
    from_stop: "STOP_NETRANG",
    to_stop: "STOP_RAJPIPLA",
    avg_time_min: 60,
    distance_km: 29,
    canonical: true,
    alias_segment_ids: [
      "SEG_RAJPIPLA_TO_NETRANG"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_NETRANG_TO_RAJPIPLA",
        from_stop: "STOP_NETRANG",
        to_stop: "STOP_RAJPIPLA",
        avg_time_min: 60,
        distance_km: 29,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_RAJPIPLA_TO_NETRANG",
        from_stop: "STOP_RAJPIPLA",
        to_stop: "STOP_NETRANG",
        avg_time_min: 60,
        distance_km: 29,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_MANDVI_SURAT_TO_TARSADA",
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_TARSADA",
    avg_time_min: 15,
    distance_km: 1.4,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_MANDVI_SURAT_TO_TARSADA",
        from_stop: "STOP_MANDVI_SURAT",
        to_stop: "STOP_TARSADA",
        avg_time_min: 15,
        distance_km: 1.4,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_TARSADA_TO_KADOD",
    from_stop: "STOP_TARSADA",
    to_stop: "STOP_KADOD",
    avg_time_min: 12,
    distance_km: 8.7,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_TARSADA_TO_KADOD",
        from_stop: "STOP_TARSADA",
        to_stop: "STOP_KADOD",
        avg_time_min: 12,
        distance_km: 8.7,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_BARDOLI_LINEAR_TO_NAVSARI",
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 50,
    distance_km: 25.7,
    canonical: true,
    alias_segment_ids: [
      "SEG_NAVSARI_TO_BARDOLI_LINEAR"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_BARDOLI_LINEAR_TO_NAVSARI",
        from_stop: "STOP_BARDOLI_LINEAR",
        to_stop: "STOP_NAVSARI",
        avg_time_min: 50,
        distance_km: 25.7,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_NAVSARI_TO_BARDOLI_LINEAR",
        from_stop: "STOP_NAVSARI",
        to_stop: "STOP_BARDOLI_LINEAR",
        avg_time_min: 45,
        distance_km: 25.7,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_VANKAL_MANDVI_TO_ZANKHVAV",
    from_stop: "STOP_VANKAL_MANDVI",
    to_stop: "STOP_ZANKHVAV",
    avg_time_min: 19,
    distance_km: 21.5,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_VANKAL_MANDVI_TO_ZANKHVAV",
        from_stop: "STOP_VANKAL_MANDVI",
        to_stop: "STOP_ZANKHVAV",
        avg_time_min: 19,
        distance_km: 21.5,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_ZANKHVAV_TO_MANDVI_SURAT",
    from_stop: "STOP_ZANKHVAV",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 29,
    distance_km: 21.6,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_ZANKHVAV_TO_MANDVI_SURAT",
        from_stop: "STOP_ZANKHVAV",
        to_stop: "STOP_MANDVI_SURAT",
        avg_time_min: 29,
        distance_km: 21.6,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_NAVSARI_TO_KHAREL",
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_KHAREL",
    avg_time_min: 23,
    distance_km: 16.4,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_NAVSARI_TO_KHAREL",
        from_stop: "STOP_NAVSARI",
        to_stop: "STOP_KHAREL",
        avg_time_min: 23,
        distance_km: 16.4,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_KHAREL_TO_CHIKHALI",
    from_stop: "STOP_KHAREL",
    to_stop: "STOP_CHIKHALI",
    avg_time_min: 19,
    distance_km: 11.3,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_KHAREL_TO_CHIKHALI",
        from_stop: "STOP_KHAREL",
        to_stop: "STOP_CHIKHALI",
        avg_time_min: 19,
        distance_km: 11.3,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_CHIKHALI_TO_DUNGRI_CROSS",
    from_stop: "STOP_CHIKHALI",
    to_stop: "STOP_DUNGRI_CROSS",
    avg_time_min: 19,
    distance_km: 13.4,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_CHIKHALI_TO_DUNGRI_CROSS",
        from_stop: "STOP_CHIKHALI",
        to_stop: "STOP_DUNGRI_CROSS",
        avg_time_min: 19,
        distance_km: 13.4,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_DUNGRI_CROSS_TO_VALSAD",
    from_stop: "STOP_DUNGRI_CROSS",
    to_stop: "STOP_VALSAD",
    avg_time_min: 16,
    distance_km: 8.6,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_DUNGRI_CROSS_TO_VALSAD",
        from_stop: "STOP_DUNGRI_CROSS",
        to_stop: "STOP_VALSAD",
        avg_time_min: 16,
        distance_km: 8.6,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_BUHARI_TO_VALOD",
    from_stop: "STOP_BUHARI",
    to_stop: "STOP_VALOD",
    avg_time_min: 20,
    distance_km: 10.1,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_BUHARI_TO_VALOD",
        from_stop: "STOP_BUHARI",
        to_stop: "STOP_VALOD",
        avg_time_min: 20,
        distance_km: 10.1,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_VALOD_TO_BARDOLI",
    from_stop: "STOP_VALOD",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 20,
    distance_km: 18.8,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_VALOD_TO_BARDOLI",
        from_stop: "STOP_VALOD",
        to_stop: "STOP_BARDOLI",
        avg_time_min: 20,
        distance_km: 18.8,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_MASAD_TO_BARDOLI",
    from_stop: "STOP_MASAD",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 20,
    distance_km: 16.8,
    canonical: true,
    alias_segment_ids: [
      "SEG_BARDOLI_TO_MASAD"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_MASAD_TO_BARDOLI",
        from_stop: "STOP_MASAD",
        to_stop: "STOP_BARDOLI",
        avg_time_min: 20,
        distance_km: 16.8,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_BARDOLI_TO_MASAD",
        from_stop: "STOP_BARDOLI",
        to_stop: "STOP_MASAD",
        avg_time_min: 30,
        distance_km: 16.8,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_GANGTHA_TO_SELAMBA",
    from_stop: "STOP_GANGTHA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 60,
    distance_km: 19.8,
    canonical: true,
    alias_segment_ids: [
      "SEG_SELAMBA_TO_GANGTHA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_GANGTHA_TO_SELAMBA",
        from_stop: "STOP_GANGTHA",
        to_stop: "STOP_SELAMBA",
        avg_time_min: 60,
        distance_km: 19.8,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_SELAMBA_TO_GANGTHA",
        from_stop: "STOP_SELAMBA",
        to_stop: "STOP_GANGTHA",
        avg_time_min: 60,
        distance_km: 19.8,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_SELAMBA_TO_UMARPADA",
    from_stop: "STOP_SELAMBA",
    to_stop: "STOP_UMARPADA",
    avg_time_min: 75,
    distance_km: 36,
    canonical: true,
    alias_segment_ids: [
      "SEG_UMARPADA_TO_SELAMBA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_SELAMBA_TO_UMARPADA",
        from_stop: "STOP_SELAMBA",
        to_stop: "STOP_UMARPADA",
        avg_time_min: 75,
        distance_km: 36,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_UMARPADA_TO_SELAMBA",
        from_stop: "STOP_UMARPADA",
        to_stop: "STOP_SELAMBA",
        avg_time_min: 176,
        distance_km: 36,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_UMARPADA_TO_MANDVI_SURAT",
    from_stop: "STOP_UMARPADA",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 65,
    distance_km: 28.6,
    canonical: true,
    alias_segment_ids: [
      "SEG_MANDVI_SURAT_TO_UMARPADA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_UMARPADA_TO_MANDVI_SURAT",
        from_stop: "STOP_UMARPADA",
        to_stop: "STOP_MANDVI_SURAT",
        avg_time_min: 65,
        distance_km: 28.6,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_MANDVI_SURAT_TO_UMARPADA",
        from_stop: "STOP_MANDVI_SURAT",
        to_stop: "STOP_UMARPADA",
        avg_time_min: 65,
        distance_km: 28.6,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_NAVSARI_TO_GANDEVI",
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_GANDEVI",
    avg_time_min: 20,
    distance_km: 17,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_NAVSARI_TO_GANDEVI",
        from_stop: "STOP_NAVSARI",
        to_stop: "STOP_GANDEVI",
        avg_time_min: 20,
        distance_km: 17,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_GANDEVI_TO_BILIMORA",
    from_stop: "STOP_GANDEVI",
    to_stop: "STOP_BILIMORA",
    avg_time_min: 20,
    distance_km: 5.5,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_GANDEVI_TO_BILIMORA",
        from_stop: "STOP_GANDEVI",
        to_stop: "STOP_BILIMORA",
        avg_time_min: 20,
        distance_km: 5.5,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_AKKALKUVA_TO_SELAMBA",
    from_stop: "STOP_AKKALKUVA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 50,
    distance_km: 20.5,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_AKKALKUVA_TO_SELAMBA",
        from_stop: "STOP_AKKALKUVA",
        to_stop: "STOP_SELAMBA",
        avg_time_min: 50,
        distance_km: 20.5,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_BARDOLI_LINEAR_TO_KADODARA",
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_KADODARA",
    avg_time_min: 64,
    distance_km: 16.5,
    canonical: true,
    alias_segment_ids: [
      "SEG_KADODARA_TO_BARDOLI_LINEAR"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_BARDOLI_LINEAR_TO_KADODARA",
        from_stop: "STOP_BARDOLI_LINEAR",
        to_stop: "STOP_KADODARA",
        avg_time_min: 64,
        distance_km: 16.5,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_KADODARA_TO_BARDOLI_LINEAR",
        from_stop: "STOP_KADODARA",
        to_stop: "STOP_BARDOLI_LINEAR",
        avg_time_min: 15,
        distance_km: 16.5,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_KADODARA_TO_SURAT",
    from_stop: "STOP_KADODARA",
    to_stop: "STOP_SURAT",
    avg_time_min: 16,
    distance_km: 13,
    canonical: true,
    alias_segment_ids: [
      "SEG_SURAT_TO_KADODARA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_KADODARA_TO_SURAT",
        from_stop: "STOP_KADODARA",
        to_stop: "STOP_SURAT",
        avg_time_min: 16,
        distance_km: 13,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_SURAT_TO_KADODARA",
        from_stop: "STOP_SURAT",
        to_stop: "STOP_KADODARA",
        avg_time_min: 35,
        distance_km: 13,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_SURAT_TO_UDHANA",
    from_stop: "STOP_SURAT",
    to_stop: "STOP_UDHANA",
    avg_time_min: 11,
    distance_km: 4.2,
    canonical: true,
    alias_segment_ids: [
      "SEG_UDHANA_TO_SURAT"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_SURAT_TO_UDHANA",
        from_stop: "STOP_SURAT",
        to_stop: "STOP_UDHANA",
        avg_time_min: 11,
        distance_km: 4.2,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_UDHANA_TO_SURAT",
        from_stop: "STOP_UDHANA",
        to_stop: "STOP_SURAT",
        avg_time_min: 20,
        distance_km: 4.2,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_UDHANA_TO_NAVSARI",
    from_stop: "STOP_UDHANA",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 28,
    distance_km: 26,
    canonical: true,
    alias_segment_ids: [
      "SEG_NAVSARI_TO_UDHANA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_UDHANA_TO_NAVSARI",
        from_stop: "STOP_UDHANA",
        to_stop: "STOP_NAVSARI",
        avg_time_min: 28,
        distance_km: 26,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_NAVSARI_TO_UDHANA",
        from_stop: "STOP_NAVSARI",
        to_stop: "STOP_UDHANA",
        avg_time_min: 40,
        distance_km: 26,
        traversal: "reverse"
      }
    ]
  },
  {
    segment_id: "SEG_UMARPADA_TO_SAGBARA",
    from_stop: "STOP_UMARPADA",
    to_stop: "STOP_SAGBARA",
    avg_time_min: 45,
    distance_km: 31.3,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_UMARPADA_TO_SAGBARA",
        from_stop: "STOP_UMARPADA",
        to_stop: "STOP_SAGBARA",
        avg_time_min: 45,
        distance_km: 31.3,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_SAGBARA_TO_SELAMBA",
    from_stop: "STOP_SAGBARA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 35,
    distance_km: 4.7,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_SAGBARA_TO_SELAMBA",
        from_stop: "STOP_SAGBARA",
        to_stop: "STOP_SELAMBA",
        avg_time_min: 35,
        distance_km: 4.7,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_GANGTHA_TO_AKKALKUVA",
    from_stop: "STOP_GANGTHA",
    to_stop: "STOP_AKKALKUVA",
    avg_time_min: 10,
    distance_km: 4.4,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_GANGTHA_TO_AKKALKUVA",
        from_stop: "STOP_GANGTHA",
        to_stop: "STOP_AKKALKUVA",
        avg_time_min: 10,
        distance_km: 4.4,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_SARBHON_TO_BARDOLI",
    from_stop: "STOP_SARBHON",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 20,
    distance_km: 9.5,
    canonical: true,
    alias_segment_ids: [],
    directional_metadata: [
      {
        segment_id: "SEG_SARBHON_TO_BARDOLI",
        from_stop: "STOP_SARBHON",
        to_stop: "STOP_BARDOLI",
        avg_time_min: 20,
        distance_km: 9.5,
        traversal: "canonical"
      }
    ]
  },
  {
    segment_id: "SEG_DEDIAPADA_TO_NETRANG",
    from_stop: "STOP_DEDIAPADA",
    to_stop: "STOP_NETRANG",
    avg_time_min: 40,
    distance_km: 23.7,
    canonical: true,
    alias_segment_ids: [
      "SEG_NETRANG_TO_DEDIAPADA"
    ],
    directional_metadata: [
      {
        segment_id: "SEG_DEDIAPADA_TO_NETRANG",
        from_stop: "STOP_DEDIAPADA",
        to_stop: "STOP_NETRANG",
        avg_time_min: 40,
        distance_km: 23.7,
        traversal: "canonical"
      },
      {
        segment_id: "SEG_NETRANG_TO_DEDIAPADA",
        from_stop: "STOP_NETRANG",
        to_stop: "STOP_DEDIAPADA",
        avg_time_min: 20,
        distance_km: 23.7,
        traversal: "reverse"
      }
    ]
  }
];

  window.BusTrackData.segmentAliases = {
  SEG_BARDOLI_TO_BARDOLI_LINEAR: {
    canonical_segment_id: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    reversed: false,
    from_stop: "STOP_BARDOLI",
    to_stop: "STOP_BARDOLI_LINEAR",
    avg_time_min: 5,
    distance_km: 1.9
  },
  SEG_BARDOLI_LINEAR_TO_SARBHON: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_SARBHON",
    reversed: false,
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_SARBHON",
    avg_time_min: 15,
    distance_km: 7.8
  },
  SEG_SARBHON_TO_NAVSARI: {
    canonical_segment_id: "SEG_SARBHON_TO_NAVSARI",
    reversed: false,
    from_stop: "STOP_SARBHON",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 20,
    distance_km: 18.8
  },
  SEG_SELAMBA_TO_DEDIAPADA: {
    canonical_segment_id: "SEG_SELAMBA_TO_DEDIAPADA",
    reversed: false,
    from_stop: "STOP_SELAMBA",
    to_stop: "STOP_DEDIAPADA",
    avg_time_min: 50,
    distance_km: 26.4
  },
  SEG_DEDIAPADA_TO_MANDVI_SURAT: {
    canonical_segment_id: "SEG_DEDIAPADA_TO_MANDVI_SURAT",
    reversed: false,
    from_stop: "STOP_DEDIAPADA",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 120,
    distance_km: 50.7
  },
  SEG_MANDVI_SURAT_TO_KADOD: {
    canonical_segment_id: "SEG_MANDVI_SURAT_TO_KADOD",
    reversed: false,
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_KADOD",
    avg_time_min: 30,
    distance_km: 9.6
  },
  SEG_KADOD_TO_BARDOLI: {
    canonical_segment_id: "SEG_KADOD_TO_BARDOLI",
    reversed: false,
    from_stop: "STOP_KADOD",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 30,
    distance_km: 14.8
  },
  SEG_BARDOLI_LINEAR_TO_MAHUVA_BARDOLI: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_MAHUVA_BARDOLI",
    reversed: false,
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_MAHUVA_BARDOLI",
    avg_time_min: 13,
    distance_km: 11.4
  },
  SEG_MAHUVA_BARDOLI_TO_NAVSARI: {
    canonical_segment_id: "SEG_MAHUVA_BARDOLI_TO_NAVSARI",
    reversed: false,
    from_stop: "STOP_MAHUVA_BARDOLI",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 45,
    distance_km: 22.6
  },
  SEG_NAVSARI_TO_SARBHON: {
    canonical_segment_id: "SEG_SARBHON_TO_NAVSARI",
    reversed: true,
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_SARBHON",
    avg_time_min: 30,
    distance_km: 18.8
  },
  SEG_SARBHON_TO_BARDOLI_LINEAR: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_SARBHON",
    reversed: true,
    from_stop: "STOP_SARBHON",
    to_stop: "STOP_BARDOLI_LINEAR",
    avg_time_min: 20,
    distance_km: 7.8
  },
  SEG_BARDOLI_LINEAR_TO_KADOD: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_KADOD",
    reversed: false,
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_KADOD",
    avg_time_min: 25,
    distance_km: 16
  },
  SEG_KADOD_TO_MANDVI_SURAT: {
    canonical_segment_id: "SEG_MANDVI_SURAT_TO_KADOD",
    reversed: true,
    from_stop: "STOP_KADOD",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 25,
    distance_km: 9.6
  },
  SEG_MANDVI_SURAT_TO_NETRANG: {
    canonical_segment_id: "SEG_MANDVI_SURAT_TO_NETRANG",
    reversed: false,
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_NETRANG",
    avg_time_min: 80,
    distance_km: 43.1
  },
  SEG_NETRANG_TO_RAJPIPLA: {
    canonical_segment_id: "SEG_NETRANG_TO_RAJPIPLA",
    reversed: false,
    from_stop: "STOP_NETRANG",
    to_stop: "STOP_RAJPIPLA",
    avg_time_min: 60,
    distance_km: 29
  },
  SEG_RAJPIPLA_TO_NETRANG: {
    canonical_segment_id: "SEG_NETRANG_TO_RAJPIPLA",
    reversed: true,
    from_stop: "STOP_RAJPIPLA",
    to_stop: "STOP_NETRANG",
    avg_time_min: 60,
    distance_km: 29
  },
  SEG_NETRANG_TO_MANDVI_SURAT: {
    canonical_segment_id: "SEG_MANDVI_SURAT_TO_NETRANG",
    reversed: true,
    from_stop: "STOP_NETRANG",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 90,
    distance_km: 43.1
  },
  SEG_KADOD_TO_BARDOLI_LINEAR: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_KADOD",
    reversed: true,
    from_stop: "STOP_KADOD",
    to_stop: "STOP_BARDOLI_LINEAR",
    avg_time_min: 30,
    distance_km: 16
  },
  SEG_BARDOLI_LINEAR_TO_BARDOLI: {
    canonical_segment_id: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    reversed: true,
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 10,
    distance_km: 1.9
  },
  SEG_MANDVI_SURAT_TO_TARSADA: {
    canonical_segment_id: "SEG_MANDVI_SURAT_TO_TARSADA",
    reversed: false,
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_TARSADA",
    avg_time_min: 15,
    distance_km: 1.4
  },
  SEG_TARSADA_TO_KADOD: {
    canonical_segment_id: "SEG_TARSADA_TO_KADOD",
    reversed: false,
    from_stop: "STOP_TARSADA",
    to_stop: "STOP_KADOD",
    avg_time_min: 12,
    distance_km: 8.7
  },
  SEG_BARDOLI_LINEAR_TO_NAVSARI: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_NAVSARI",
    reversed: false,
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 50,
    distance_km: 25.7
  },
  SEG_VANKAL_MANDVI_TO_ZANKHVAV: {
    canonical_segment_id: "SEG_VANKAL_MANDVI_TO_ZANKHVAV",
    reversed: false,
    from_stop: "STOP_VANKAL_MANDVI",
    to_stop: "STOP_ZANKHVAV",
    avg_time_min: 19,
    distance_km: 21.5
  },
  SEG_ZANKHVAV_TO_MANDVI_SURAT: {
    canonical_segment_id: "SEG_ZANKHVAV_TO_MANDVI_SURAT",
    reversed: false,
    from_stop: "STOP_ZANKHVAV",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 29,
    distance_km: 21.6
  },
  SEG_NAVSARI_TO_KHAREL: {
    canonical_segment_id: "SEG_NAVSARI_TO_KHAREL",
    reversed: false,
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_KHAREL",
    avg_time_min: 23,
    distance_km: 16.4
  },
  SEG_KHAREL_TO_CHIKHALI: {
    canonical_segment_id: "SEG_KHAREL_TO_CHIKHALI",
    reversed: false,
    from_stop: "STOP_KHAREL",
    to_stop: "STOP_CHIKHALI",
    avg_time_min: 19,
    distance_km: 11.3
  },
  SEG_CHIKHALI_TO_DUNGRI_CROSS: {
    canonical_segment_id: "SEG_CHIKHALI_TO_DUNGRI_CROSS",
    reversed: false,
    from_stop: "STOP_CHIKHALI",
    to_stop: "STOP_DUNGRI_CROSS",
    avg_time_min: 19,
    distance_km: 13.4
  },
  SEG_DUNGRI_CROSS_TO_VALSAD: {
    canonical_segment_id: "SEG_DUNGRI_CROSS_TO_VALSAD",
    reversed: false,
    from_stop: "STOP_DUNGRI_CROSS",
    to_stop: "STOP_VALSAD",
    avg_time_min: 16,
    distance_km: 8.6
  },
  SEG_BARDOLI_TO_KADOD: {
    canonical_segment_id: "SEG_KADOD_TO_BARDOLI",
    reversed: true,
    from_stop: "STOP_BARDOLI",
    to_stop: "STOP_KADOD",
    avg_time_min: 20,
    distance_km: 14.8
  },
  SEG_BUHARI_TO_VALOD: {
    canonical_segment_id: "SEG_BUHARI_TO_VALOD",
    reversed: false,
    from_stop: "STOP_BUHARI",
    to_stop: "STOP_VALOD",
    avg_time_min: 20,
    distance_km: 10.1
  },
  SEG_VALOD_TO_BARDOLI: {
    canonical_segment_id: "SEG_VALOD_TO_BARDOLI",
    reversed: false,
    from_stop: "STOP_VALOD",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 20,
    distance_km: 18.8
  },
  SEG_MASAD_TO_BARDOLI: {
    canonical_segment_id: "SEG_MASAD_TO_BARDOLI",
    reversed: false,
    from_stop: "STOP_MASAD",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 20,
    distance_km: 16.8
  },
  SEG_GANGTHA_TO_SELAMBA: {
    canonical_segment_id: "SEG_GANGTHA_TO_SELAMBA",
    reversed: false,
    from_stop: "STOP_GANGTHA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 60,
    distance_km: 19.8
  },
  SEG_SELAMBA_TO_UMARPADA: {
    canonical_segment_id: "SEG_SELAMBA_TO_UMARPADA",
    reversed: false,
    from_stop: "STOP_SELAMBA",
    to_stop: "STOP_UMARPADA",
    avg_time_min: 75,
    distance_km: 36
  },
  SEG_UMARPADA_TO_MANDVI_SURAT: {
    canonical_segment_id: "SEG_UMARPADA_TO_MANDVI_SURAT",
    reversed: false,
    from_stop: "STOP_UMARPADA",
    to_stop: "STOP_MANDVI_SURAT",
    avg_time_min: 65,
    distance_km: 28.6
  },
  SEG_MANDVI_SURAT_TO_UMARPADA: {
    canonical_segment_id: "SEG_UMARPADA_TO_MANDVI_SURAT",
    reversed: true,
    from_stop: "STOP_MANDVI_SURAT",
    to_stop: "STOP_UMARPADA",
    avg_time_min: 65,
    distance_km: 28.6
  },
  SEG_UMARPADA_TO_SELAMBA: {
    canonical_segment_id: "SEG_SELAMBA_TO_UMARPADA",
    reversed: true,
    from_stop: "STOP_UMARPADA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 176,
    distance_km: 36
  },
  SEG_NAVSARI_TO_GANDEVI: {
    canonical_segment_id: "SEG_NAVSARI_TO_GANDEVI",
    reversed: false,
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_GANDEVI",
    avg_time_min: 20,
    distance_km: 17
  },
  SEG_GANDEVI_TO_BILIMORA: {
    canonical_segment_id: "SEG_GANDEVI_TO_BILIMORA",
    reversed: false,
    from_stop: "STOP_GANDEVI",
    to_stop: "STOP_BILIMORA",
    avg_time_min: 20,
    distance_km: 5.5
  },
  SEG_AKKALKUVA_TO_SELAMBA: {
    canonical_segment_id: "SEG_AKKALKUVA_TO_SELAMBA",
    reversed: false,
    from_stop: "STOP_AKKALKUVA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 50,
    distance_km: 20.5
  },
  SEG_BARDOLI_LINEAR_TO_KADODARA: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_KADODARA",
    reversed: false,
    from_stop: "STOP_BARDOLI_LINEAR",
    to_stop: "STOP_KADODARA",
    avg_time_min: 64,
    distance_km: 16.5
  },
  SEG_KADODARA_TO_SURAT: {
    canonical_segment_id: "SEG_KADODARA_TO_SURAT",
    reversed: false,
    from_stop: "STOP_KADODARA",
    to_stop: "STOP_SURAT",
    avg_time_min: 16,
    distance_km: 13
  },
  SEG_SURAT_TO_UDHANA: {
    canonical_segment_id: "SEG_SURAT_TO_UDHANA",
    reversed: false,
    from_stop: "STOP_SURAT",
    to_stop: "STOP_UDHANA",
    avg_time_min: 11,
    distance_km: 4.2
  },
  SEG_UDHANA_TO_NAVSARI: {
    canonical_segment_id: "SEG_UDHANA_TO_NAVSARI",
    reversed: false,
    from_stop: "STOP_UDHANA",
    to_stop: "STOP_NAVSARI",
    avg_time_min: 28,
    distance_km: 26
  },
  SEG_NAVSARI_TO_UDHANA: {
    canonical_segment_id: "SEG_UDHANA_TO_NAVSARI",
    reversed: true,
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_UDHANA",
    avg_time_min: 40,
    distance_km: 26
  },
  SEG_UDHANA_TO_SURAT: {
    canonical_segment_id: "SEG_SURAT_TO_UDHANA",
    reversed: true,
    from_stop: "STOP_UDHANA",
    to_stop: "STOP_SURAT",
    avg_time_min: 20,
    distance_km: 4.2
  },
  SEG_SURAT_TO_KADODARA: {
    canonical_segment_id: "SEG_KADODARA_TO_SURAT",
    reversed: true,
    from_stop: "STOP_SURAT",
    to_stop: "STOP_KADODARA",
    avg_time_min: 35,
    distance_km: 13
  },
  SEG_KADODARA_TO_BARDOLI_LINEAR: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_KADODARA",
    reversed: true,
    from_stop: "STOP_KADODARA",
    to_stop: "STOP_BARDOLI_LINEAR",
    avg_time_min: 15,
    distance_km: 16.5
  },
  SEG_UMARPADA_TO_SAGBARA: {
    canonical_segment_id: "SEG_UMARPADA_TO_SAGBARA",
    reversed: false,
    from_stop: "STOP_UMARPADA",
    to_stop: "STOP_SAGBARA",
    avg_time_min: 45,
    distance_km: 31.3
  },
  SEG_SAGBARA_TO_SELAMBA: {
    canonical_segment_id: "SEG_SAGBARA_TO_SELAMBA",
    reversed: false,
    from_stop: "STOP_SAGBARA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 35,
    distance_km: 4.7
  },
  SEG_SELAMBA_TO_GANGTHA: {
    canonical_segment_id: "SEG_GANGTHA_TO_SELAMBA",
    reversed: true,
    from_stop: "STOP_SELAMBA",
    to_stop: "STOP_GANGTHA",
    avg_time_min: 60,
    distance_km: 19.8
  },
  SEG_GANGTHA_TO_AKKALKUVA: {
    canonical_segment_id: "SEG_GANGTHA_TO_AKKALKUVA",
    reversed: false,
    from_stop: "STOP_GANGTHA",
    to_stop: "STOP_AKKALKUVA",
    avg_time_min: 10,
    distance_km: 4.4
  },
  SEG_BARDOLI_TO_MASAD: {
    canonical_segment_id: "SEG_MASAD_TO_BARDOLI",
    reversed: true,
    from_stop: "STOP_BARDOLI",
    to_stop: "STOP_MASAD",
    avg_time_min: 30,
    distance_km: 16.8
  },
  SEG_SARBHON_TO_BARDOLI: {
    canonical_segment_id: "SEG_SARBHON_TO_BARDOLI",
    reversed: false,
    from_stop: "STOP_SARBHON",
    to_stop: "STOP_BARDOLI",
    avg_time_min: 20,
    distance_km: 9.5
  },
  SEG_DEDIAPADA_TO_NETRANG: {
    canonical_segment_id: "SEG_DEDIAPADA_TO_NETRANG",
    reversed: false,
    from_stop: "STOP_DEDIAPADA",
    to_stop: "STOP_NETRANG",
    avg_time_min: 40,
    distance_km: 23.7
  },
  SEG_NAVSARI_TO_BARDOLI_LINEAR: {
    canonical_segment_id: "SEG_BARDOLI_LINEAR_TO_NAVSARI",
    reversed: true,
    from_stop: "STOP_NAVSARI",
    to_stop: "STOP_BARDOLI_LINEAR",
    avg_time_min: 45,
    distance_km: 25.7
  },
  SEG_NETRANG_TO_DEDIAPADA: {
    canonical_segment_id: "SEG_DEDIAPADA_TO_NETRANG",
    reversed: true,
    from_stop: "STOP_NETRANG",
    to_stop: "STOP_DEDIAPADA",
    avg_time_min: 20,
    distance_km: 23.7
  },
  SEG_DEDIAPADA_TO_SELAMBA: {
    canonical_segment_id: "SEG_SELAMBA_TO_DEDIAPADA",
    reversed: true,
    from_stop: "STOP_DEDIAPADA",
    to_stop: "STOP_SELAMBA",
    avg_time_min: 45,
    distance_km: 26.4
  }
};
})();
