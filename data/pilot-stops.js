(function () {
  window.BusTrackData = window.BusTrackData || {};

  // Normalized GSRTC-style pilot stops. Impossible out-of-region coordinates are excluded.

  window.BusTrackData.pilotStops = [
    {
      stop_id: "STOP_BARDOLI",
      stop_name: "Bardoli GSRTC Bus Station",
      latitude: 21.13333187170484,
      longitude: 73.10663164532181,
      aliases: [
        "Bardoli Station",
        "Bardoli station",
        "Bardoli GSRTC",
        "Bardoli St"
      ]
    },
    {
      stop_id: "STOP_BARDOLI_LINEAR",
      stop_name: "Bardoli Linear",
      latitude: 21.116313287380198,
      longitude: 73.10791212744404,
      aliases: [
        "Bardoli linir",
        "Bardoli Linir",
        "Bardoli Link Road"
      ]
    },
    {
      stop_id: "STOP_SARBHON",
      stop_name: "Sarbhon",
      latitude: 21.050898935695436,
      longitude: 73.0816827628349,
      aliases: [
        "sarbhon"
      ]
    },
    {
      stop_id: "STOP_NAVSARI",
      stop_name: "Navsari GSRTC Bus Station",
      latitude: 20.949655016370855,
      longitude: 72.9362614916834,
      aliases: [
        "Navsari",
        "Nvarsari"
      ]
    },
    {
      stop_id: "STOP_KADODARA",
      stop_name: "Kadodara",
      latitude: 21.17206925297597,
      longitude: 72.9602150890263,
      aliases: []
    },
    {
      stop_id: "STOP_UDHANA",
      stop_name: "Udhana (Surat)",
      latitude: 21.16642315220455,
      longitude: 72.84163624254015,
      aliases: [
        "Udhana",
        "Udhana(Surat)",
        "Udhna"
      ]
    },
    {
      stop_id: "STOP_SURAT",
      stop_name: "Surat Central GSRTC Bus Station",
      latitude: 21.203824559184255,
      longitude: 72.83990831117355,
      aliases: [
        "Surat Central",
        "Surat"
      ]
    },
    {
      stop_id: "STOP_SELAMBA",
      stop_name: "Selamba",
      latitude: 21.519636734364234,
      longitude: 73.8182058169101,
      aliases: []
    },
    {
      stop_id: "STOP_MANDVI_SURAT",
      stop_name: "Mandvi (Surat)",
      latitude: 21.25653746534474,
      longitude: 73.30113398061586,
      aliases: [
        "Mandvi(Surat)",
        "Mandvi"
      ]
    },
    {
      stop_id: "STOP_GANGTHA",
      stop_name: "Gangtha",
      latitude: 21.513160379510527,
      longitude: 74.00940359846682,
      aliases: []
    },
    {
      stop_id: "STOP_MASAD",
      stop_name: "Masad",
      latitude: 21.21419301474283,
      longitude: 73.24336037401189,
      aliases: []
    },
    {
      stop_id: "STOP_VALOD",
      stop_name: "Valod",
      latitude: 21.04880463342982,
      longitude: 73.26381837349197,
      aliases: []
    },
    {
      stop_id: "STOP_NETRANG",
      stop_name: "Netrang",
      latitude: 21.640003498493094,
      longitude: 73.360539043541,
      aliases: []
    },
    {
      stop_id: "STOP_VANKAL_MANDVI",
      stop_name: "Vankal (Mandvi)",
      latitude: 21.257076561041938,
      longitude: 73.30302699492958,
      aliases: [
        "vankal(Mandvi)",
        "Vankal Mandvi"
      ]
    },
    {
      stop_id: "STOP_KHAREL",
      stop_name: "Kharel",
      latitude: 20.861726485684112,
      longitude: 73.06264639332674,
      aliases: []
    },
    {
      stop_id: "STOP_CHIKHALI",
      stop_name: "Chikhali",
      latitude: 20.760274719275362,
      longitude: 73.05986891905765,
      aliases: [
        "Chikhli"
      ]
    },
    {
      stop_id: "STOP_DUNGRI_CROSS",
      stop_name: "Dungri Cross Road",
      latitude: 20.682636336075944,
      longitude: 72.96132582181698,
      aliases: [
        "Dungri cross road"
      ]
    },
    {
      stop_id: "STOP_VALSAD",
      stop_name: "Valsad",
      latitude: 20.610309786421535,
      longitude: 72.93231421281405,
      aliases: [
        "Valsad GSRTC Bus Station"
      ]
    },
    {
      stop_id: "STOP_ZANKHVAV",
      stop_name: "Zankhvav",
      latitude: 21.44991352876512,
      longitude: 73.32063179944858,
      aliases: [
        "Zankhvat",
        "Zankhvav"
      ]
    },
    {
      stop_id: "STOP_TARSADA",
      stop_name: "Tarsada",
      latitude: 21.244279162916982,
      longitude: 73.29791219082438,
      aliases: []
    },
    {
      stop_id: "STOP_MAHUVA_BARDOLI",
      stop_name: "Mahuva (Bardoli)",
      latitude: 21.01820447129955,
      longitude: 73.1414232495055,
      aliases: [
        "Mahuva",
        "Mahuva(Bardoli)"
      ]
    },
    {
      stop_id: "STOP_DEDIAPADA",
      stop_name: "Dediapada",
      latitude: 21.625377466593918,
      longitude: 73.58936970856949,
      aliases: []
    },
    {
      stop_id: "STOP_BUHARI",
      stop_name: "Buhari",
      latitude: 20.967564026560193,
      longitude: 73.30819522953601,
      aliases: []
    },
    {
      stop_id: "STOP_RAJPIPLA",
      stop_name: "Rajpipla",
      latitude: 21.865414379143004,
      longitude: 73.50167866713934,
      aliases: [
        "Rajpipala",
        "Rajpipla"
      ]
    },
    {
      stop_id: "STOP_UMARPADA",
      stop_name: "Umarpada",
      latitude: 21.45509125415676,
      longitude: 73.47693239154664,
      aliases: []
    },
    {
      stop_id: "STOP_BILIMORA",
      stop_name: "Bilimora Depot",
      latitude: 20.76842576819721,
      longitude: 72.97038555436025,
      aliases: [
        "Bilimora Bus Depot"
      ]
    },
    {
      stop_id: "STOP_GANDEVI",
      stop_name: "Gandevi",
      latitude: 20.809117845490434,
      longitude: 73.00017448391728,
      aliases: []
    },
    {
      stop_id: "STOP_AKKALKUVA",
      stop_name: "Akkalkuva - Maharashtra",
      latitude: 21.55278912120962,
      longitude: 74.0135503190748,
      aliases: [
        "Akkalkuva",
        "Akkalkuwa"
      ]
    },
    {
      stop_id: "STOP_DUNGRI",
      stop_name: "Dungri",
      latitude: 21.40476606637032,
      longitude: 73.12254741292607,
      aliases: []
    },
    {
      stop_id: "STOP_VYARA",
      stop_name: "Vyara",
      latitude: 21.11392207431844,
      longitude: 73.3866575895093,
      aliases: []
    },
    {
      stop_id: "STOP_SONGADH",
      stop_name: "Songadh",
      latitude: 21.171380581334017,
      longitude: 73.56481939236855,
      aliases: []
    },
    {
      stop_id: "STOP_KADOD",
      stop_name: "Kadod",
      latitude: 21.21493948738988,
      longitude: 73.21992085432267,
      aliases: []
    },
    {
      stop_id: "STOP_SAGBARA",
      stop_name: "Sagbara",
      latitude: 21.5097,
      longitude: 73.7741,
      aliases: []
    }
  ];
})();
