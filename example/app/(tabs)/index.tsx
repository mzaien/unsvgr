import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { Icon } from "@/components/nanoicons/appIcons";

export default function HomeScreen() {
	return (
		<ParallaxScrollView
			headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
			headerImage={
				<Image
					source={require("@/assets/images/partial-react-logo.png")}
					style={styles.reactLogo}
				/>
			}
		>
			<View style={styles.titleContainer}>
				<Text style={styles.titleText}>Welcome!</Text>
				<Icon
					name="NotesIcon"
					size={100}
					color="orange"
					allowFontScaling={false}
					style={{ alignSelf: "flex-start" }}
				/>
				<HelloWave />
			</View>
			<View>
				<Icon name="CalendarIcon" size={18} color="magenta" />

				{/* Icons work inline with text */}

				<Text style={styles.bodyText}>
					Tap <Icon name="XIcon" size={12} color="tomato" /> to save
				</Text>
			</View>
		</ParallaxScrollView>
	);
}

const styles = StyleSheet.create({
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	stepContainer: {
		gap: 8,
		marginBottom: 8,
	},
	titleText: {
		fontSize: 32,
		fontWeight: "700",
		color: "#ECEDEE",
	},
	bodyText: {
		fontSize: 17,
		color: "#ECEDEE",
	},
	reactLogo: {
		height: 178,
		width: 290,
		bottom: 0,
		left: 0,
		position: "absolute",
	},
});
