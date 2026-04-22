
            "use client";

            import { BadgeTimeLogSection } from "@/components/profile/dashboards/badge-time-log-section";

            type DeveloperDashboardProps = {
                badgeNumber: string;
            };

            export function DeveloperDashboard({ badgeNumber }: DeveloperDashboardProps) {
                return (
                    <div className="space-y-6">
                        <section className="rounded-lg border bg-muted/40 p-4">
                            <h2 className="text-xl font-semibold">Hello, Developer</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Welcome to your dashboard. Here is a quick overview of your work, priorities, and activity.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="space-y-4">
                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="text-base font-semibold">Overview</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Your day is currently focused on active assignments and follow-up tasks.
                                    </p>
                                </section>

                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="text-base font-semibold">Time Clock</h3>
                                    <p className="mt-2 text-sm">Last clock-in: 8:00 AM</p>
                                    <p className="text-sm text-muted-foreground">Total hours logged this week: 32</p>
                                </section>

                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="text-base font-semibold">Assignments</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        You have 5 pending assignments. Make sure to complete them on time.
                                    </p>
                                </section>

                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="text-base font-semibold">Task List</h3>
                                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                                        <li>Complete code review for Project Alpha.</li>
                                        <li>Update documentation for Project Beta.</li>
                                        <li>Fix bug in Project Gamma.</li>
                                    </ul>
                                </section>
                            </div>

                            <div className="space-y-4">
                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="text-base font-semibold">Feed</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Stay updated with the latest news and announcements from your team.
                                    </p>
                                </section>

                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="text-base font-semibold">Activity Timeline</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Track your recent activities and milestones here.
                                    </p>
                                </section>

                                <section className="rounded-lg border bg-card p-4">
                                    <h3 className="mb-3 text-base font-semibold">Stats</h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="rounded-md bg-muted/40 p-3">
                                            <p className="text-xs text-muted-foreground">Hours Logged This Week</p>
                                            <p className="mt-1 text-sm font-semibold">32 hours</p>
                                        </div>
                                        <div className="rounded-md bg-muted/40 p-3">
                                            <p className="text-xs text-muted-foreground">Active Projects</p>
                                            <p className="mt-1 text-sm font-semibold">3 projects</p>
                                        </div>
                                        <div className="rounded-md bg-muted/40 p-3">
                                            <p className="text-xs text-muted-foreground">Pending Assignments</p>
                                            <p className="mt-1 text-sm font-semibold">5 assignments</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-lg border bg-card p-4">
                                    <BadgeTimeLogSection badgeNumber={badgeNumber} />
                                </section>
                            </div>
                        </div>
                    </div>
                );
            }
