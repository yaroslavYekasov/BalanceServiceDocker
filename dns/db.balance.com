$TTL    604800
@       IN      SOA     ns1.balance.com. admin.balance.com. (
                          2024112401 ; Serial
                          604800     ; Refresh
                          86400      ; Retry
                          2419200    ; Expire
                          604800 )   ; Negative Cache TTL
@       IN      NS      ns1.balance.com.
ns1     IN      A       192.168.56.10
web     IN      A       192.168.56.10
