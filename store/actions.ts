import {Constant} from '../utils/constants';
import {getStorageMedia} from '../utils/functions';
import {storagePermission} from '../utils/permissions';

export const getPhotos = (limit: number = 20, after: string = '0') => {
  return async (dispatch: any, getState: any) => {
    let permission = false;
    //const state = getState()
    //const lastPhotoCurser = state.lastPhotoCurser;

    dispatch({type: Constant.actionTypes.photos.getPhotosRequest});

    await storagePermission()
      .then(() => (permission = true))
      .catch((err) =>
        dispatch({
          type: Constant.actionTypes.photos.getPhotosFailure,
          payload: err,
        }),
      );

    try {
      const response = await getStorageMedia(permission, limit, after);
      dispatch({
        type: Constant.actionTypes.photos.getPhotosSuccess,
        payload: response?.assets,
      });
    } catch {
      dispatch({
        type: Constant.actionTypes.photos.getPhotosFailure,
        payload: 'The getting photos request failed',
      });
    }
  };
};
