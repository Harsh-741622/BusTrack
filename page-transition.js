(function () {
  function isLocalPageLink(anchor) {
    if (!anchor || !anchor.href || anchor.target) {
      return false;
    }

    if (anchor.origin !== window.location.origin) {
      return false;
    }

    return anchor.pathname.indexOf(".html") !== -1;
  }

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest("a");

    if (!isLocalPageLink(anchor)) {
      return;
    }

    event.preventDefault();
    document.body.classList.add("page-exit");

    window.setTimeout(function () {
      window.location.href = anchor.href;
    }, 180);
  });
})();
