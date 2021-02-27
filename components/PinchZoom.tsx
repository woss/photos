import React, {useEffect, useState} from 'react';
import {Animated, Dimensions, PanResponder} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {reduxState, sortCondition} from '../types/interfaces';
import {Constant} from '../utils/constants';
import {
  changeSortCondition,
  findDiameter,
  getDistance,
} from '../utils/functions';

const SCREEN_WIDTH = Dimensions.get('screen').width;
const SCREEN_HEIGHT = Dimensions.get('screen').height;

interface Props {
  distance: Animated.Value;
}

const PinchZoom: React.FC<Props> = (props) => {
  let initialXs: Array<number> = [];
  let initialYs: Array<number> = [];
  let currentXs: Array<number> = [];
  let currentYs: Array<number> = [];
  let zIndex: number = 0;
  let initial_distance: number = 0;
  let current_distance: number = 0;

  const sortCondition = useSelector((state: reduxState) => state.sortCondition);
  const numColumns = useSelector((state: reduxState) => state.numColumns);

  const [sortConditionState, setSortConditionState] = useState<string>("day")
  const [numColumnsState, setNumColumnsState] = useState<number>(2)

  useEffect(() => {
    if(sortConditionState){
      dispatch({type: Constant.actionTypes.sortConditionChange, payload: sortConditionState})
    }
  }, [sortConditionState])

  useEffect(() => {
    if (numColumnsState){
      dispatch({type: Constant.actionTypes.numColumnsChange, payload: numColumnsState})
    }
  }, [numColumnsState])

  const dispatch = useDispatch();

  const animationTransition = (pinchOrZoom: "pinch" | "zoom") => {

    console.log("sortConditionState", sortConditionState, "numColumnsState", numColumnsState)

    let _sortCondition = changeSortCondition(sortCondition, pinchOrZoom, numColumns).sortCondition
    let _numColumns = changeSortCondition(sortCondition, pinchOrZoom, numColumns).numColumns

    setSortConditionState(_sortCondition)
    setNumColumnsState(_numColumns)
  }

  const panResponder = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: (event, gesture) => {
        let touches = event.nativeEvent.touches;
        if (gesture.numberActiveTouches == 2) {
          zIndex = 2;
          return true;
        } else {
          zIndex = 0;
          return false;
        }
      },
      onPanResponderStart: (initial_event, initial_gesture) => {
        let touches = initial_event.nativeEvent.touches;

        initialXs = [];
        initialYs = [];

        initialXs.push(touches[0].locationX);
        initialXs.push(touches[1].locationX);
        initialYs.push(touches[0].locationY);
        initialYs.push(touches[1].locationY);
      },
      onPanResponderMove: (event, gesture) => {
        let touches = event.nativeEvent.touches;

        if (touches.length == 2) {
          currentXs = [];
          currentYs = [];

          currentXs.push(touches[0].locationX);
          currentXs.push(touches[1].locationX);
          currentYs.push(touches[0].locationY);
          currentYs.push(touches[1].locationY);

          initial_distance = getDistance(
            initialXs[0],
            initialYs[0],
            initialXs[1],
            initialYs[1],
          );
          current_distance = getDistance(
            currentXs[0],
            currentYs[0],
            currentXs[1],
            currentYs[1],
          );
        }

        props.distance.setValue(initial_distance - current_distance);
      },
      onPanResponderRelease: () => {
        zIndex = 0;
        let animationProgress = (props.distance as any)._value;
        if (Math.abs(animationProgress) < SCREEN_WIDTH * 0.1) {
          Animated.timing(props.distance, {
            toValue: -SCREEN_WIDTH * 0.8,
            duration: 250,
            useNativeDriver: false,
          }).start();
        } else if (animationProgress < -(SCREEN_WIDTH * 0.1)) {
          Animated.timing(props.distance, {
            toValue: -SCREEN_WIDTH * 0.8,
            duration: 250,
            useNativeDriver: false,
          }).start(() => animationTransition("zoom"));
        } else if (animationProgress > SCREEN_WIDTH * 0.1) {
          Animated.timing(props.distance, {
            toValue: SCREEN_WIDTH * 0.8,
            duration: 250,
            useNativeDriver: false,
          }).start(() => animationTransition("pinch"));
        }
      },
    }),
  )[0];

  return (
    <Animated.View
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        zIndex: zIndex,
      }}
      {...panResponder.panHandlers}>
      {props.children}
    </Animated.View>
  );
};

export default PinchZoom;
