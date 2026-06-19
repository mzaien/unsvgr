import Svg, { Circle, Rect, Ellipse, Polygon, Polyline, Line, G, Path } from 'react-native-svg';

export function CircleRectEllipseIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Circle cx="30" cy="30" r="20" fill="#FF0000" />
            <Rect x="50" y="50" width="30" height="20" rx="5" ry="3" fill="#00FF00" opacity={0.8} />
            <Ellipse cx="70" cy="20" rx="15" ry="8" fill="#0000FF" />
        </Svg>
    );
}

export function PolygonPolylineIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Polygon points="10,10 30,10 20,30" fill="#FFD700" stroke="#000" strokeWidth={1} />
            <Polyline points="40,40 60,40 50,60" fill="none" stroke="#333" strokeWidth={1.5} />
            <Line x1="10" y1="70" x2="90" y2="90" stroke="#666" strokeWidth={2} />
        </Svg>
    );
}

export function GroupIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <G transform="translate(10, 10)" opacity={0.8}>
                <Circle cx="20" cy="20" r="15" fill="#FF6347" />
                <Path d="M10 10L30 30" stroke="#000" strokeWidth={2} />
            </G>
            <G opacity={0.5}>
                <Rect x="60" y="60" width="30" height="20" fill="#4682B4" />
            </G>
        </Svg>
    );
}
