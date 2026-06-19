import Svg, {
    Path, Rect, Circle, Ellipse, Line, Polygon,
    Defs, LinearGradient, RadialGradient, Stop,
    ClipPath, Pattern, Marker, Filter, FeGaussianBlur,
    Mask, Symbol, Use, G, Text, TSpan, TextPath,
    ForeignObject, Image,
} from 'react-native-svg';

export function GradientIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(45)">
                    <Stop offset="0%" stopColor="#FF0000" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#0000FF" stopOpacity="0.5" />
                </LinearGradient>
                <RadialGradient id="grad2" cx="50%" cy="50%" r="50%" fx="30%" fy="30%" gradientUnits="objectBoundingBox">
                    <Stop offset="0%" stopColor="#00FF00" />
                    <Stop offset="100%" stopColor="#0000FF" />
                </RadialGradient>
            </Defs>
            <Rect x="10" y="10" width="80" height="35" fill="url(#grad1)" rx="5" />
            <Circle cx="50" cy="75" r="20" fill="url(#grad2)" />
        </Svg>
    );
}

export function ClipPathIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <ClipPath id="clip1" clipPathUnits="userSpaceOnUse">
                    <Circle cx="50" cy="50" r="40" />
                </ClipPath>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="#FFD700" clipPath="url(#clip1)" />
        </Svg>
    );
}

export function PatternIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <Pattern id="pat1" width="20" height="20" patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <Circle cx="10" cy="10" r="5" fill="#FF6347" />
                </Pattern>
            </Defs>
            <Rect x="10" y="10" width="80" height="80" fill="url(#pat1)" rx="5" />
        </Svg>
    );
}

export function MarkerIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <Marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                    <Path d="M0,0 L0,6 L9,3 z" fill="#000" />
                </Marker>
            </Defs>
            <Line x1="10" y1="50" x2="80" y2="50" stroke="#333" strokeWidth={2} markerEnd="url(#arrow)" />
        </Svg>
    );
}

export function FilterBlurIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <Filter id="blur1" x="-20%" y="-20%" width="140%" height="140%">
                    <FeGaussianBlur stdDeviation="3" in="SourceGraphic" />
                </Filter>
            </Defs>
            <Circle cx="50" cy="50" r="30" fill="#FF6347" filter="url(#blur1)" />
        </Svg>
    );
}

export function MaskIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <Mask id="mask1" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                    <Rect x="0" y="0" width="100" height="100" fill="white" />
                    <Circle cx="50" cy="50" r="20" fill="black" />
                </Mask>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="#FF6347" mask="url(#mask1)" />
        </Svg>
    );
}

export function SymbolUseIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Defs>
                <Symbol id="star" viewBox="0 0 20 20" width="20" height="20">
                    <Polygon points="10,1 13,7 20,8 15,13 16,20 10,17 4,20 5,13 0,8 7,7" fill="#FFD700" />
                </Symbol>
            </Defs>
            <Use href="#star" x="10" y="10" />
            <Use href="#star" x="50" y="40" width="30" height="30" />
        </Svg>
    );
}

export function TextIcon(props: any) {
    return (
        <Svg viewBox="0 0 200 200" fill="none">
            <Defs>
                <Path id="textPath1" d="M10 100 Q 100 20, 190 100" fill="none" />
            </Defs>
            <Text x="20" y="40" fontSize="16" fill="#333" fontFamily="Arial" fontWeight="bold">
                Hello<TSpan dx="5" dy="5">World</TSpan>
            </Text>
            <TextPath href="#textPath1" fontSize="14" fill="#666" startOffset="50%" textAnchor="middle">Curved Text</TextPath>
        </Svg>
    );
}

export function ForeignImageIcon(props: any) {
    return (
        <Svg viewBox="0 0 100 100" fill="none">
            <Rect x="10" y="10" width="80" height="80" fill="#EEE" rx="8" />
            <ForeignObject x="20" y="20" width="60" height="30">
                <Text x="25" y="35" fontSize="10" fill="#333">Hello</Text>
            </ForeignObject>
            <Image x="30" y="60" width="40" height="30" href="https://example.com/img.png" />
        </Svg>
    );
}
