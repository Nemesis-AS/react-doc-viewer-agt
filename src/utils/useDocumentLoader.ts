import { Dispatch, useContext, useEffect } from "react";
import { DocViewerContext } from "../state";
import {
  MainStateActions,
  setDocumentLoading,
  updateCurrentDocument,
} from "../state/actions";
import { IMainState } from "../state/reducer";
import { DocRenderer } from "../types";
import { defaultFileLoader, FileLoaderComplete } from "./fileLoaders";
import { useRendererSelector } from "./useRendererSelector";

/**
 * Custom Hook for loading the current document into context
 */
export const useDocumentLoader = (): {
  state: IMainState;
  dispatch: Dispatch<MainStateActions>;
  CurrentRenderer: DocRenderer | null | undefined;
} => {
  const { state, dispatch } = useContext(DocViewerContext);
  const { currentFileNo, currentDocument } = state;

  const { CurrentRenderer } = useRendererSelector();

  const documentURI = currentDocument?.uri || "";

  useEffect(
    () => {
      if (!currentDocument) return;
      if (currentDocument.fileType !== undefined) return;

      const controller = new AbortController();
      const { signal } = controller;

      fetch(documentURI, { method: "GET", signal }).then((response) => {
        // const contentTypeRaw = response.headers.get("content-type");
        // const contentTypes = contentTypeRaw?.split(";") || [];
        // const contentType = contentTypes.length ? contentTypes[0] : undefined;

        const ext = new URL(documentURI).pathname.split(".").at(-1);
        let guessedMime = null;
        switch (ext) {
          case "pdf": {
            guessedMime = "application/pdf";
            break;
          }
          case "png": {
            guessedMime = "image/png";
            break;
          }
          case "jpg":
          case "jpeg": {
            guessedMime = "image/jpeg";
            break;
          }
          case "txt": {
            guessedMime = "text/plain";
            break;
          }
          default:
            guessedMime = "application/octet-stream";
        }

        dispatch(
          updateCurrentDocument({
            ...currentDocument,
            fileType: guessedMime || undefined,
          })
        );
      });

      return () => {
        controller.abort();
      };
    },
    // eslint ignore added, because a warning appears for dispatch to
    // be a dependancy of the useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentFileNo, documentURI]
  );

  useEffect(() => {
    if (!currentDocument || CurrentRenderer === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fileLoaderComplete: FileLoaderComplete = (fileReader) => {
      if (!currentDocument || !fileReader) {
        dispatch(setDocumentLoading(false));
        return;
      }

      let updatedDocument = { ...currentDocument };
      if (fileReader.result !== null) {
        updatedDocument.fileData = fileReader.result;
      }

      dispatch(updateCurrentDocument(updatedDocument));
      dispatch(setDocumentLoading(false));
    };

    if (CurrentRenderer === null) {
      dispatch(setDocumentLoading(false));
    } else if (CurrentRenderer.fileLoader !== undefined) {
      CurrentRenderer.fileLoader?.({ documentURI, signal, fileLoaderComplete });
    } else {
      defaultFileLoader({ documentURI, signal, fileLoaderComplete });
    }

    return () => {
      controller.abort();
    };
  }, [CurrentRenderer]);

  return { state, dispatch, CurrentRenderer };
};
