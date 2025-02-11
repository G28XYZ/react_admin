import axios from "axios";
import React, { useState, useEffect } from "react";
import DOMHelper from "../../helpers/domHelper.js";
import EditorText from "../editorText/editorText.js";
import UIkit from "uikit";
import Spinner from "../spinner/spinner";
import ModalOpenPage from "../modal-open-page/ModalOpenPage";
import ModalPublish from "../modal-publish/ModalPublish";

import "../../helpers/iframeLoader.js";

export default function Editor() {
  let iframe;
  let virtualDom;
  const [_virtualDom, setVirtualDom] = useState();
  const [currentPage, setCurrentPage] = useState("index.html");
  const [_state, setState] = useState({
    pageList: [],
    newPageName: "",
  });
  const [load, setLoad] = useState(true);

  const _setState = (data) => setState((state) => ({ ...state, ...data }));

  useEffect(() => {
    init(currentPage);
  }, []);

  function loadPageList() {
    axios
      .get("./api")
      .then((res) => _setState({ pageList: res.data }))
      .catch(alert);
  }

  function init(page) {
    iframe = document.querySelector("iframe");
    open(page);
    loadPageList();
  }

  function open(page) {
    // setCurrentPage(`../${page}?rnd=${Math.random()}`);
    setCurrentPage(page);

    axios
      .get(`../${page}`)
      .then((res) => DOMHelper.parseStringToDom(res.data))
      .then(DOMHelper.wrapTextNodes)
      .then((dom) => {
        virtualDom = dom;
        setVirtualDom(virtualDom);
        return dom;
      })
      .then(DOMHelper.serializeDOMToString)
      .then((html) => axios.post("./api/saveTempPage.php", { html }))
      .then(() => iframe.load("../temp.html"))
      .then(enableEditing)
      .then(() => injectStyle())
      .then(() => setLoad(false));

    // iframe.load(currentPage, () => {});
  }

  function save() {
    const newDom = virtualDom.cloneNode(virtualDom);
    DOMHelper.unwrapTextNodes(newDom);
    const html = DOMHelper.serializeDOMToString(newDom);
    setLoad(true);
    axios
      .post("./api/savePage.php", { pageName: currentPage, html })
      .then(() => UIkit.notification({ message: "Готово!", status: "success" }))
      .catch(() => UIkit.notification({ message: "Ошибка!", status: "warning" }))
      .finally(() => setLoad(false));
  }

  function enableEditing() {
    iframe.contentDocument.body.querySelectorAll("text-editor").forEach((element) => {
      const id = element.getAttribute("nodeid");
      const virtualElement = virtualDom.body.querySelector(`[nodeid="${id}"]`);
      new EditorText(element, virtualElement);
    });
  }

  function injectStyle() {
    const style = iframe.contentDocument.createElement("style");
    style.innerHTML = `
        text-editor:hover {
          outline: 3px solid orange;
          outline-offset: 8px;
        }
        text-editor:focus {
          outline: 3px solid red;
          outline-offset: 8px;
        }
      `;
    iframe.contentDocument.head.appendChild(style);
  }

  function createNewPage() {
    axios
      .post("./api/createNewPage.php", {
        name: _state.newPageName,
      })
      .then(loadPageList)
      .catch(alert);
  }

  function deletePage(page) {
    axios
      .post("./api/deletePage.php", { name: page })
      .then(loadPageList)
      .catch(() => alert("Страницы не существует"));
  }

  const { pageList } = _state;
  const pages = pageList.map((page, i) => {
    return (
      <h1 key={i}>
        {page}
        <a href="#" onClick={() => deletePage(page)}>
          (x)
        </a>
      </h1>
    );
  });

  const openModal = (e) => {
    const name = e.target.name;
    UIkit.modal("#modal-" + name).show();
  };

  return (
    <>
      <iframe src={`../${currentPage}`} frameBorder={0}></iframe>

      <div className="panel">
        <button
          onClick={openModal}
          className="uk-button uk-button-primary uk-margin-small-right"
          name="page"
        >
          Открыть
        </button>
        <button onClick={openModal} className="uk-button uk-button-primary" name="publish">
          Опубликовать
        </button>
      </div>
      <Spinner active={load} />
      <ModalOpenPage action={console.log} />
      <ModalPublish action={save} />
    </>
  );
}
