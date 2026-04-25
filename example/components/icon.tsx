import { View, ViewStyle } from "react-native";
import Svg, { Path, SvgProps } from "react-native-svg";
import { Colors } from "@/constants/theme";

const defaultColor = '#FCFCFC';

export function XIcon(props: SvgProps & {size?: number; style?: ViewStyle}) {
    return (
        <View style={props.style}>
            <Svg
                width={props.size || 12}
                height={props.size || 12}
                viewBox="0 0 12 12"
                fill="none"
                {...props}
            >
                <Path
                    d="M11 1L1 11M1 1L11 11"
                    stroke={props.color || Colors.dark.icon}
                    strokeWidth={props.strokeWidth || 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
}

export function NotesIcon(props: SvgProps) {
    return (
        <Svg
            viewBox="0 0 22 22"
            width={props.width || 22}
            height={props.height || 22}
            fill="none"
            {...props}
        >
            <Path
                d="M10 3.00023H5.8C4.11984 3.00023 3.27976 3.00023 2.63803 3.32721C2.07354 3.61483 1.6146 4.07377 1.32698 4.63826C1 5.27999 1 6.12007 1 7.80023V16.2002C1 17.8804 1 18.7205 1.32698 19.3622C1.6146 19.9267 2.07354 20.3856 2.63803 20.6732C3.27976 21.0002 4.11984 21.0002 5.8 21.0002H14.2C15.8802 21.0002 16.7202 21.0002 17.362 20.6732C17.9265 20.3856 18.3854 19.9267 18.673 19.3622C19 18.7205 19 17.8804 19 16.2002V12.0002M6.99997 15.0002H8.67452C9.1637 15.0002 9.40829 15.0002 9.63846 14.945C9.84254 14.896 10.0376 14.8152 10.2166 14.7055C10.4184 14.5818 10.5914 14.4089 10.9373 14.063L20.5 4.50023C21.3284 3.6718 21.3284 2.32865 20.5 1.50023C19.6716 0.6718 18.3284 0.671799 17.5 1.50022L7.93723 11.063C7.59133 11.4089 7.41838 11.5818 7.29469 11.7837C7.18504 11.9626 7.10423 12.1577 7.05523 12.3618C6.99997 12.5919 6.99997 12.8365 6.99997 13.3257V15.0002Z"
                stroke={props.color || Colors.dark.background}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function CalendarIcon(props: SvgProps) {
    return (
        <Svg
            viewBox="0 0 20 22"
            width={props.width || 20}
            height={props.height || 22}
            fill="none"
            {...props}
        >
            <Path
                d="M19 9H1M14 1V5M6 1V5M5.8 21H14.2C15.8802 21 16.7202 21 17.362 20.673C17.9265 20.3854 18.3854 19.9265 18.673 19.362C19 18.7202 19 17.8802 19 16.2V7.8C19 6.11984 19 5.27976 18.673 4.63803C18.3854 4.07354 17.9265 3.6146 17.362 3.32698C16.7202 3 15.8802 3 14.2 3H5.8C4.11984 3 3.27976 3 2.63803 3.32698C2.07354 3.6146 1.6146 4.07354 1.32698 4.63803C1 5.27976 1 6.11984 1 7.8V16.2C1 17.8802 1 18.7202 1.32698 19.362C1.6146 19.9265 2.07354 20.3854 2.63803 20.673C3.27976 21 4.11984 21 5.8 21Z"
                stroke={props.color || defaultColor}
                strokeWidth={props.strokeWidth ?? 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}
