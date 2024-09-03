import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });

let courses = {};
let certificates = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);

        if (jsonPayload.method === "create_course") {
            courses[jsonPayload.courseId] = {
                title: jsonPayload.title,
                instructor: sender,
                students: []
            };
            console.log("Course created:", jsonPayload.courseId);

        } else if (jsonPayload.method === "enroll") {
            const course = courses[jsonPayload.courseId];
            if (course) {
                course.students.push(sender);
                console.log("Enrolled in course:", jsonPayload.courseId);

            } else {
                console.error("Error: Course not found.");
            }

        } else if (jsonPayload.method === "complete_course") {
            const course = courses[jsonPayload.courseId];
            if (course && course.students.includes(sender)) {
                certificates[sender] = certificates[sender] || [];
                certificates[sender].push(jsonPayload.courseId);
                console.log("Course completed:", jsonPayload.courseId);

            } else {
                console.error("Error: Course not found or not enrolled.");
            }
        }

        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const address = getAddress(hexToString(payload).split("/")[1]);
    const userCertificates = certificates[address] || [];
    await app.createReport({ payload: stringToHex(JSON.stringify(userCertificates)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
