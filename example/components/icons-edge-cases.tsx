import Svg, { Path, Circle, Rect } from 'react-native-svg';

const defaultColor = '#FCFCFC';
const palette = { primary: '#FF0000', secondary: '#00FF00' };

function getRandomColor() {
    return Math.random() > 0.5 ? '#FF0000' : '#00FF00';
}

export function StaticOnlyIcon() {
    return (
        <Svg viewBox="0 0 12 12" fill="none">
            <Circle cx="6" cy="6" r="5" fill="#FFD700" />
            <Path d="M3 6L5 8L9 4" stroke="#333" strokeWidth={2} />
        </Svg>
    );
}

export function TemplateLiteralIcon(props: any) {
    return (
        <Svg viewBox="0 0 12 12" fill="none">
            <Circle cx="6" cy="6" r="5" fill={`#${'FF0000'}`} />
            <Path d="M3 6L5 8L9 4" stroke={`hsl(0, 100%, ${50}%)`} strokeWidth={2} />
        </Svg>
    );
}

export function TernaryResolvableIcon(props: any) {
    return (
        <Svg viewBox="0 0 12 12" fill="none">
            <Circle cx="6" cy="6" r="5" fill={true ? '#FF0000' : '#00FF00'} />
            <Path d="M3 6L5 8L9 4" stroke={1 > 0 ? '#333' : '#666'} strokeWidth={2} />
        </Svg>
    );
}

export function NonConvertibleIcon(props: any) {
    return (
        <Svg viewBox="0 0 12 12" fill="none">
            <Circle cx="6" cy="6" r="5" fill={getRandomColor()} />
        </Svg>
    );
}

export const ExportDefaultIcon = () => (
    <Svg viewBox="0 0 12 12" fill="none">
        <Rect x="1" y="1" width="10" height="10" fill={defaultColor} rx={2} />
        <Path d="M4 6L6 8L8 4" stroke={palette.primary} strokeWidth={2} />
    </Svg>
);

export default { ExportDefaultIcon };
