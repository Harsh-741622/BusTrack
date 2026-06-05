(function () {
  window.BusTrackData = window.BusTrackData || {};

  // Routes reference canonical reusable segments. Trip-level stop_times carry exact schedule runs.

  window.BusTrackData.pilotRoutes = [
  {
    route_id: "ROUTE_BARDOLI_NAVSARI",
    route_name: "Bardoli GSRTC Bus Station to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_SARBHON",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_SARBHON_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "05:40"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "05:45"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "06:00"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "06:20"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_SELAMBA_NAVSARI",
    route_name: "Selamba to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_SELAMBA",
      "STOP_DEDIAPADA",
      "STOP_NETRANG",
      "STOP_MANDVI_SURAT",
      "STOP_KADOD",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_MAHUVA_BARDOLI",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_SELAMBA_TO_DEDIAPADA",
      "SEG_DEDIAPADA_TO_NETRANG",
      "SEG_MANDVI_SURAT_TO_NETRANG",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_MAHUVA_BARDOLI",
      "SEG_MAHUVA_BARDOLI_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "13:15"
      },
      {
        stop_id: "STOP_DEDIAPADA",
        arrival_time: "14:05"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "14:48"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "16:05"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "16:35"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "17:05"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "17:12"
      },
      {
        stop_id: "STOP_MAHUVA_BARDOLI",
        arrival_time: "17:25"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "18:10"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_RAJPIPLA",
    route_name: "Navsari GSRTC Bus Station to Rajpipla",
    direction: "onward",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_SARBHON",
      "STOP_BARDOLI_LINEAR",
      "STOP_KADOD",
      "STOP_MANDVI_SURAT",
      "STOP_NETRANG",
      "STOP_RAJPIPLA"
    ],
    segments: [
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_BARDOLI_LINEAR_TO_KADOD",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_MANDVI_SURAT_TO_NETRANG",
      "SEG_NETRANG_TO_RAJPIPLA"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "07:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "07:50"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "08:15"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "08:40"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "10:00"
      },
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "11:00"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_RAJPIPLA_NAVSARI",
    route_name: "Rajpipla to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_RAJPIPLA",
      "STOP_NETRANG",
      "STOP_MANDVI_SURAT",
      "STOP_KADOD",
      "STOP_BARDOLI_LINEAR",
      "STOP_SARBHON",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_NETRANG_TO_RAJPIPLA",
      "SEG_MANDVI_SURAT_TO_NETRANG",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_BARDOLI_LINEAR_TO_KADOD",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_SARBHON_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "12:10"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "13:10"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "14:40"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:00"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "15:30"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "15:50"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "16:10"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_BARDOLI",
    route_name: "Navsari GSRTC Bus Station to Bardoli GSRTC Bus Station",
    direction: "onward",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_SARBHON",
      "STOP_BARDOLI_LINEAR",
      "STOP_BARDOLI"
    ],
    segments: [
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "08:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "08:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "08:40"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "08:50"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_MANDVI_SURAT_NAVSARI",
    route_name: "Mandvi (Surat) to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_MANDVI_SURAT",
      "STOP_TARSADA",
      "STOP_KADOD",
      "STOP_BARDOLI_LINEAR",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_MANDVI_SURAT_TO_TARSADA",
      "SEG_TARSADA_TO_KADOD",
      "SEG_BARDOLI_LINEAR_TO_KADOD",
      "SEG_BARDOLI_LINEAR_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "06:00"
      },
      {
        stop_id: "STOP_TARSADA",
        arrival_time: "06:15"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "06:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "06:50"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:40"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_VANKAL_MANDVI_VALSAD",
    route_name: "Vankal (Mandvi) to Valsad",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_VANKAL_MANDVI",
      "STOP_ZANKHVAV",
      "STOP_MANDVI_SURAT",
      "STOP_KADOD",
      "STOP_BARDOLI_LINEAR",
      "STOP_SARBHON",
      "STOP_NAVSARI",
      "STOP_KHAREL",
      "STOP_CHIKHALI",
      "STOP_DUNGRI_CROSS",
      "STOP_VALSAD"
    ],
    segments: [
      "SEG_VANKAL_MANDVI_TO_ZANKHVAV",
      "SEG_ZANKHVAV_TO_MANDVI_SURAT",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_BARDOLI_LINEAR_TO_KADOD",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_NAVSARI_TO_KHAREL",
      "SEG_KHAREL_TO_CHIKHALI",
      "SEG_CHIKHALI_TO_DUNGRI_CROSS",
      "SEG_DUNGRI_CROSS_TO_VALSAD"
    ],
    stop_timings: [
      {
        stop_id: "STOP_VANKAL_MANDVI",
        arrival_time: "05:32"
      },
      {
        stop_id: "STOP_ZANKHVAV",
        arrival_time: "05:51"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "06:20"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "06:35"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "06:58"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "07:09"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:36"
      },
      {
        stop_id: "STOP_KHAREL",
        arrival_time: "07:59"
      },
      {
        stop_id: "STOP_CHIKHALI",
        arrival_time: "08:18"
      },
      {
        stop_id: "STOP_DUNGRI_CROSS",
        arrival_time: "08:37"
      },
      {
        stop_id: "STOP_VALSAD",
        arrival_time: "08:53"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_RAJPIPLA_2",
    route_name: "Navsari GSRTC Bus Station to Rajpipla",
    direction: "onward",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_SARBHON",
      "STOP_BARDOLI_LINEAR",
      "STOP_BARDOLI",
      "STOP_KADOD",
      "STOP_MANDVI_SURAT",
      "STOP_NETRANG",
      "STOP_RAJPIPLA"
    ],
    segments: [
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_MANDVI_SURAT_TO_NETRANG",
      "SEG_NETRANG_TO_RAJPIPLA"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "13:20"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "13:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "14:10"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "14:15"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "14:35"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "15:00"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "16:20"
      },
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "17:20"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_BUHARI_NAVSARI",
    route_name: "Buhari to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_BUHARI",
      "STOP_VALOD",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_SARBHON",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_BUHARI_TO_VALOD",
      "SEG_VALOD_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_SARBHON_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_BUHARI",
        arrival_time: "08:10"
      },
      {
        stop_id: "STOP_VALOD",
        arrival_time: "08:30"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "08:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "09:15"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "09:45"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_MASAD_NAVSARI",
    route_name: "Masad to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_MASAD",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_SARBHON",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_MASAD_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_SARBHON_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_MASAD",
        arrival_time: "09:10"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:40"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "10:00"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "10:20"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_GANGTHA_NAVSARI",
    route_name: "Gangtha to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_GANGTHA",
      "STOP_SELAMBA",
      "STOP_SAGBARA",
      "STOP_UMARPADA",
      "STOP_MANDVI_SURAT",
      "STOP_KADOD",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_SARBHON",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_GANGTHA_TO_SELAMBA",
      "SEG_SAGBARA_TO_SELAMBA",
      "SEG_UMARPADA_TO_SAGBARA",
      "SEG_UMARPADA_TO_MANDVI_SURAT",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_SARBHON_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_GANGTHA",
        arrival_time: "06:10"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "07:10"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "07:20"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "08:25"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "09:50"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "10:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "10:28"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "10:41"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "12:00"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_SELAMBA",
    route_name: "Navsari GSRTC Bus Station to Selamba",
    direction: "reverse",
    direction_symbol: "<",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_SARBHON",
      "STOP_BARDOLI_LINEAR",
      "STOP_BARDOLI",
      "STOP_KADOD",
      "STOP_MANDVI_SURAT",
      "STOP_UMARPADA",
      "STOP_SAGBARA",
      "STOP_SELAMBA"
    ],
    segments: [
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_UMARPADA_TO_MANDVI_SURAT",
      "SEG_UMARPADA_TO_SAGBARA",
      "SEG_SAGBARA_TO_SELAMBA"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "14:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "14:38"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "14:51"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:00"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:30"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "15:49"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "16:54"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "19:27"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "19:50"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_BARDOLI_BILIMORA",
    route_name: "Bardoli GSRTC Bus Station to Bilimora Depot",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_NAVSARI",
      "STOP_GANDEVI",
      "STOP_BILIMORA"
    ],
    segments: [
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_NAVSARI",
      "SEG_NAVSARI_TO_GANDEVI",
      "SEG_GANDEVI_TO_BILIMORA"
    ],
    stop_timings: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "09:10"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "09:40"
      },
      {
        stop_id: "STOP_GANDEVI",
        arrival_time: "10:00"
      },
      {
        stop_id: "STOP_BILIMORA",
        arrival_time: "10:20"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_AKKALKUVA_NAVSARI",
    route_name: "Akkalkuva - Maharashtra to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_AKKALKUVA",
      "STOP_SELAMBA",
      "STOP_SAGBARA",
      "STOP_UMARPADA",
      "STOP_MANDVI_SURAT",
      "STOP_KADOD",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_KADODARA",
      "STOP_SURAT",
      "STOP_UDHANA",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_AKKALKUVA_TO_SELAMBA",
      "SEG_SAGBARA_TO_SELAMBA",
      "SEG_UMARPADA_TO_SAGBARA",
      "SEG_UMARPADA_TO_MANDVI_SURAT",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_KADODARA",
      "SEG_KADODARA_TO_SURAT",
      "SEG_SURAT_TO_UDHANA",
      "SEG_UDHANA_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_AKKALKUVA",
        arrival_time: "05:31"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "06:21"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "06:40"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "08:47"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "09:45"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "10:13"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "10:55"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "11:01"
      },
      {
        stop_id: "STOP_KADODARA",
        arrival_time: "12:05"
      },
      {
        stop_id: "STOP_SURAT",
        arrival_time: "12:21"
      },
      {
        stop_id: "STOP_UDHANA",
        arrival_time: "12:32"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "13:00"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_AKKALKUVA",
    route_name: "Navsari GSRTC Bus Station to Akkalkuva - Maharashtra",
    direction: "reverse",
    direction_symbol: "<",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_UDHANA",
      "STOP_SURAT",
      "STOP_KADODARA",
      "STOP_BARDOLI_LINEAR",
      "STOP_BARDOLI",
      "STOP_KADOD",
      "STOP_MANDVI_SURAT",
      "STOP_UMARPADA",
      "STOP_SAGBARA",
      "STOP_SELAMBA",
      "STOP_GANGTHA",
      "STOP_AKKALKUVA"
    ],
    segments: [
      "SEG_UDHANA_TO_NAVSARI",
      "SEG_SURAT_TO_UDHANA",
      "SEG_KADODARA_TO_SURAT",
      "SEG_BARDOLI_LINEAR_TO_KADODARA",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_UMARPADA_TO_MANDVI_SURAT",
      "SEG_UMARPADA_TO_SAGBARA",
      "SEG_SAGBARA_TO_SELAMBA",
      "SEG_GANGTHA_TO_SELAMBA",
      "SEG_GANGTHA_TO_AKKALKUVA"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "13:15"
      },
      {
        stop_id: "STOP_UDHANA",
        arrival_time: "13:55"
      },
      {
        stop_id: "STOP_SURAT",
        arrival_time: "14:15"
      },
      {
        stop_id: "STOP_KADODARA",
        arrival_time: "14:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "15:05"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:10"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:25"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "16:15"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "16:55"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "17:15"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "17:50"
      },
      {
        stop_id: "STOP_GANGTHA",
        arrival_time: "18:50"
      },
      {
        stop_id: "STOP_AKKALKUVA",
        arrival_time: "19:00"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_MASAD",
    route_name: "Navsari GSRTC Bus Station to Masad",
    direction: "onward",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_SARBHON",
      "STOP_BARDOLI_LINEAR",
      "STOP_BARDOLI",
      "STOP_MASAD"
    ],
    segments: [
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_BARDOLI_LINEAR_TO_SARBHON",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_MASAD_TO_BARDOLI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "15:10"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "15:45"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:00"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "16:10"
      },
      {
        stop_id: "STOP_MASAD",
        arrival_time: "16:40"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_BARDOLI_LINEAR",
    route_name: "Navsari GSRTC Bus Station to Bardoli Linear",
    direction: "onward",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_SARBHON",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR"
    ],
    segments: [
      "SEG_SARBHON_TO_NAVSARI",
      "SEG_SARBHON_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "15:40"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "16:10"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "16:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:40"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_SELAMBA_NAVSARI_2",
    route_name: "Selamba to Navsari GSRTC Bus Station",
    direction: "southbound",
    direction_symbol: ">",
    ordered_stops: [
      "STOP_SELAMBA",
      "STOP_DEDIAPADA",
      "STOP_NETRANG",
      "STOP_MANDVI_SURAT",
      "STOP_KADOD",
      "STOP_BARDOLI",
      "STOP_BARDOLI_LINEAR",
      "STOP_NAVSARI"
    ],
    segments: [
      "SEG_SELAMBA_TO_DEDIAPADA",
      "SEG_DEDIAPADA_TO_NETRANG",
      "SEG_MANDVI_SURAT_TO_NETRANG",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_BARDOLI_LINEAR_TO_NAVSARI"
    ],
    stop_timings: [
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "13:00"
      },
      {
        stop_id: "STOP_DEDIAPADA",
        arrival_time: "13:35"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "14:15"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "15:15"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:35"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:55"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:01"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "16:50"
      }
    ],
    path_coordinates: []
  },
  {
    route_id: "ROUTE_NAVSARI_SELAMBA_2",
    route_name: "Navsari GSRTC Bus Station to Selamba",
    direction: "reverse",
    direction_symbol: "<",
    ordered_stops: [
      "STOP_NAVSARI",
      "STOP_BARDOLI_LINEAR",
      "STOP_BARDOLI",
      "STOP_KADOD",
      "STOP_MANDVI_SURAT",
      "STOP_NETRANG",
      "STOP_DEDIAPADA",
      "STOP_SELAMBA"
    ],
    segments: [
      "SEG_BARDOLI_LINEAR_TO_NAVSARI",
      "SEG_BARDOLI_TO_BARDOLI_LINEAR",
      "SEG_KADOD_TO_BARDOLI",
      "SEG_MANDVI_SURAT_TO_KADOD",
      "SEG_MANDVI_SURAT_TO_NETRANG",
      "SEG_DEDIAPADA_TO_NETRANG",
      "SEG_SELAMBA_TO_DEDIAPADA"
    ],
    stop_timings: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "08:10"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "08:55"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "09:02"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "09:50"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "11:00"
      },
      {
        stop_id: "STOP_DEDIAPADA",
        arrival_time: "11:20"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "12:05"
      }
    ],
    path_coordinates: []
  }
];
})();
