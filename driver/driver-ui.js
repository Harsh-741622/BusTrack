(function () {
  var driver = window.BusTrackDriver || {};
  var buses = driver.demoBuses || [];
  var form = document.getElementById("driverBusForm");
  var busSearch = document.getElementById("driverBusSearch");
  var qrBtn = document.getElementById("driverQrBtn");
  var status = document.getElementById("driverSearchStatus");
  var quickButtons = Array.prototype.slice.call(
    document.querySelectorAll("[data-bus]")
  );

  function ensureIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function normalizeBusNo(value) {
    return String(value || "").trim().toUpperCase();
  }

  function findBus(value) {
    var normalized = normalizeBusNo(value);

    return buses.find(function (bus) {
      return bus.busNo.toUpperCase() === normalized;
    });
  }

  function findClosestBus(value) {
    var normalized = normalizeBusNo(value);

    if (!normalized) {
      return null;
    }

    return buses.find(function (bus) {
      return bus.busNo.toUpperCase().indexOf(normalized) !== -1;
    });
  }

  function setStatus(message) {
    if (status) {
      status.innerText = message || "";
    }
  }

  function openOperations(busNo) {
    var url = "./bus-operations.html?bus=" + encodeURIComponent(busNo);
    document.body.classList.add("page-exit");

    window.setTimeout(function () {
      window.location.href = url;
    }, 180);
  }

  function handleBusSelection(value) {
    var bus = findBus(value) || findClosestBus(value);

    if (!bus) {
      setStatus("No pilot bus found. Try GJ-18-Z-7932 or GJ-18-Z-7945.");
      return;
    }

    setStatus("Opening operations console for " + bus.busNo + ".");
    openOperations(bus.busNo);
  }

  if (!form || !busSearch) {
    ensureIcons();
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleBusSelection(busSearch.value);
  });

  quickButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      handleBusSelection(button.getAttribute("data-bus"));
    });
  });

  if (qrBtn) {
    qrBtn.addEventListener("click", function () {
      handleBusSelection("GJ-18-Z-7932");
    });
  }

  busSearch.addEventListener("input", function () {
    setStatus("");
  });

  ensureIcons();
})();
